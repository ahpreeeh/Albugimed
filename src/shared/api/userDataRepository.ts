import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

type UserDataRow = {
  data_key: string;
  data_value: unknown;
};

interface SessionContext {
  supabase: SupabaseClient | null;
  userId: string | null;
}

function warn(operation: string, error: unknown) {
  console.warn(`[userDataRepository] ${operation}`, error);
}

// ─── Cached session context ──────────────────────────────────────────
//
// Performance optimization: previously each get/set/remove/batchGet call
// triggered a fresh `auth.getUser()` roundtrip to Supabase, which on the
// cockpit mount produced ~10 redundant auth calls. We now memoize the
// `getSessionContext()` Promise at module level and invalidate it on auth
// state changes.
//
// Invariants enforced:
//   1. Cache the in-flight Promise, not the resolved value — concurrent
//      callers during the first fetch share the same network request.
//   2. Listener is attached lazily, on the browser only, and only once
//      per module lifetime (singleton).
//   3. Listener resets the cache on SIGNED_IN / SIGNED_OUT /
//      TOKEN_REFRESHED / USER_UPDATED so we never serve a stale userId.
//   4. If `auth.getUser()` throws or returns an error, the cache is
//      cleared synchronously so the next call retries instead of being
//      poisoned by a transient failure.
//   5. Mid-flight invalidation is detected via `cacheEpoch`. If an auth
//      event lands while `auth.getUser()` is still awaiting, the resolved
//      userId belongs to a now-defunct session and MUST NOT be surfaced
//      to callers. Each fetch snapshots `cacheEpoch` at start and bails
//      with `userId: null` if it has moved by the time getUser resolves.
// ─────────────────────────────────────────────────────────────────────

let cachedContextPromise: Promise<SessionContext> | null = null;
let listenerInitialized = false;
// Bumped on every invalidation. fetchSessionContext captures this at start
// and re-reads it after the auth.getUser await to detect mid-flight
// invalidation — see invariant 5 above.
let cacheEpoch = 0;

function invalidateContextCache() {
  cacheEpoch++;
  cachedContextPromise = null;
}

function ensureAuthListener(supabase: SupabaseClient) {
  if (listenerInitialized) return;
  if (typeof window === "undefined") return;
  listenerInitialized = true;

  supabase.auth.onAuthStateChange((event) => {
    if (
      event === "SIGNED_IN" ||
      event === "SIGNED_OUT" ||
      event === "TOKEN_REFRESHED" ||
      event === "USER_UPDATED"
    ) {
      invalidateContextCache();
    }
  });
}

async function fetchSessionContext(): Promise<SessionContext> {
  const fetchEpoch = cacheEpoch;
  try {
    const supabase = createClient();
    ensureAuthListener(supabase);

    const { data, error } = await supabase.auth.getUser();

    // Mid-flight invalidation guard. If SIGNED_OUT / SIGNED_IN /
    // TOKEN_REFRESHED / USER_UPDATED landed while we were awaiting
    // getUser, the resolved userId points to a session that no longer
    // exists — surface it would let `get`/`set`/`batchGet` read or write
    // user_data with a stale identity. Bail with userId: null instead.
    //
    // Do NOT clobber cachedContextPromise here: invalidateContextCache()
    // has already reset it, and a newer fetch triggered by a subsequent
    // caller may now own that slot.
    if (fetchEpoch !== cacheEpoch) {
      return { supabase, userId: null };
    }

    if (error) {
      warn("auth.getUser failed", error);
      // Clear cache so the next caller retries — don't poison subsequent
      // reads with a transient auth failure.
      cachedContextPromise = null;
      return { supabase, userId: null };
    }

    return { supabase, userId: data.user?.id ?? null };
  } catch (error) {
    if (fetchEpoch !== cacheEpoch) {
      // Same mid-flight invalidation case but in the throwing path:
      // don't log a "createClient/getUser failed" warning for a fetch
      // whose result we're discarding anyway, and don't clobber the
      // cache slot now owned by a newer fetch.
      return { supabase: null, userId: null };
    }
    warn("createClient/getUser failed", error);
    cachedContextPromise = null;
    return { supabase: null, userId: null };
  }
}

function getSessionContext(): Promise<SessionContext> {
  if (cachedContextPromise === null) {
    cachedContextPromise = fetchSessionContext();
  }
  return cachedContextPromise;
}

/**
 * Test-only helper to reset the module-level cache between tests.
 * Not part of the public API — do not call from production code.
 */
export function __resetSessionContextCacheForTests() {
  cachedContextPromise = null;
  listenerInitialized = false;
  cacheEpoch = 0;
}

// ─── Public repository API ───────────────────────────────────────────

export const userDataRepository = {
  async get<T>(key: string): Promise<T | null> {
    const { supabase, userId } = await getSessionContext();

    if (!supabase || !userId) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("user_data")
        .select("data_value")
        .eq("user_id", userId)
        .eq("data_key", key)
        .maybeSingle();

      if (error) {
        warn(`get failed for "${key}"`, error);
        return null;
      }

      return (data?.data_value as T | null | undefined) ?? null;
    } catch (error) {
      warn(`get failed for "${key}"`, error);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    const { supabase, userId } = await getSessionContext();

    if (!supabase || !userId) {
      return;
    }

    try {
      const { error } = await supabase.from("user_data").upsert(
        {
          user_id: userId,
          data_key: key,
          data_value: value,
        },
        { onConflict: "user_id,data_key" },
      );

      if (error) {
        warn(`set failed for "${key}"`, error);
      }
    } catch (error) {
      warn(`set failed for "${key}"`, error);
    }
  },

  async remove(key: string): Promise<void> {
    const { supabase, userId } = await getSessionContext();

    if (!supabase || !userId) {
      return;
    }

    try {
      const { error } = await supabase
        .from("user_data")
        .delete()
        .eq("user_id", userId)
        .eq("data_key", key);

      if (error) {
        warn(`remove failed for "${key}"`, error);
      }
    } catch (error) {
      warn(`remove failed for "${key}"`, error);
    }
  },

  async batchGet(keys: string[]): Promise<Record<string, unknown>> {
    if (keys.length === 0) {
      return {};
    }

    const { supabase, userId } = await getSessionContext();

    if (!supabase || !userId) {
      return {};
    }

    try {
      const { data, error } = await supabase
        .from("user_data")
        .select("data_key,data_value")
        .eq("user_id", userId)
        .in("data_key", keys);

      if (error) {
        warn(`batchGet failed for "${keys.join(",")}"`, error);
        return {};
      }

      return (data ?? []).reduce<Record<string, unknown>>((acc, row) => {
        const entry = row as UserDataRow;
        acc[entry.data_key] = entry.data_value;
        return acc;
      }, {});
    } catch (error) {
      warn(`batchGet failed for "${keys.join(",")}"`, error);
      return {};
    }
  },
};
