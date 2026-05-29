import { userDataRepository } from "./userDataRepository";

// ─── Cloud batch loader ──────────────────────────────────────────────
//
// Coalesces multiple concurrent reads from `userDataRepository` into a
// single `batchGet([...keys])` Supabase round-trip per microtask tick.
//
// Design choices :
//   - In-flight only, NO durable cache. Once a batch resolves, its
//     entries are discarded. Subsequent reads start a fresh batch.
//     Rationale: a durable cache would have to be invalidated by every
//     `userDataRepository.set/remove` (and any external write), which is
//     fragile. The local `useCloudValue` state already plays the role of
//     the consumer-side cache.
//   - Same-tick dedup: multiple `loadKey('a')` calls in the same tick
//     share a single network read.
//   - Missing key → resolves `null` (matches `userDataRepository.get`
//     behavior).
//   - `batchGet` error → resolves `null` for every key (matches
//     `userDataRepository.get` behavior — never reject).
// ─────────────────────────────────────────────────────────────────────

type Resolver = (value: unknown) => void;

let pendingResolvers: Map<string, Resolver[]> = new Map();
let batchScheduled = false;

function scheduleFlush() {
  if (batchScheduled) return;
  batchScheduled = true;
  queueMicrotask(flushBatch);
}

async function flushBatch() {
  // Snapshot then reset BEFORE awaiting so calls arriving during the
  // in-flight batch start a fresh batch instead of joining this one.
  const snapshot = pendingResolvers;
  pendingResolvers = new Map();
  batchScheduled = false;

  const keys = Array.from(snapshot.keys());
  if (keys.length === 0) return;

  let result: Record<string, unknown> = {};
  let failed = false;

  try {
    result = await userDataRepository.batchGet(keys);
  } catch {
    failed = true;
  }

  for (const key of keys) {
    const value = failed ? null : (result[key] ?? null);
    const resolvers = snapshot.get(key);
    if (!resolvers) continue;
    for (const resolver of resolvers) {
      resolver(value);
    }
  }
}

/**
 * Coalescing read of a single key. Multiple calls in the same microtask
 * tick are batched into a single `userDataRepository.batchGet`. Returns
 * `null` if the key is absent from the result OR if the batch fails.
 */
export function loadKey<T>(key: string): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const existing = pendingResolvers.get(key);
    const resolver: Resolver = resolve as Resolver;
    if (existing) {
      existing.push(resolver);
    } else {
      pendingResolvers.set(key, [resolver]);
    }
    scheduleFlush();
  });
}

/**
 * Test-only helper to reset module-level state between tests.
 * Not part of the public API.
 */
export function __resetBatchLoaderForTests() {
  pendingResolvers = new Map();
  batchScheduled = false;
}
