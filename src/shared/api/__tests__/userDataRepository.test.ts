import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUserSpy, onAuthStateChangeSpy } = vi.hoisted(() => ({
  getUserSpy: vi.fn(),
  onAuthStateChangeSpy: vi.fn(),
}));

type User = { id: string } | null;

let currentUser: User = null;
let rows = new Map<string, unknown>();
let storedAuthCallback: ((event: string) => void) | null = null;

function makeStorageKey(userId: string, dataKey: string) {
  return `${userId}:${dataKey}`;
}

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: getUserSpy,
      onAuthStateChange: onAuthStateChangeSpy,
    },
    from: vi.fn((table: string) => {
      if (table !== "user_data") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: vi.fn((columns: string) => {
          if (columns === "data_value") {
            let userId = "";
            let dataKey = "";

            return {
              eq(field: string, value: string) {
                if (field === "user_id") {
                  userId = value;
                }
                if (field === "data_key") {
                  dataKey = value;
                }
                return this;
              },
              maybeSingle: vi.fn(async () => {
                const stored = rows.get(makeStorageKey(userId, dataKey));
                return {
                  data:
                    stored === undefined
                      ? null
                      : {
                          data_value: stored,
                        },
                  error: null,
                };
              }),
            };
          }

          if (columns === "data_key,data_value") {
            let userId = "";
            let dataKeys: string[] = [];

            return {
              eq(field: string, value: string) {
                if (field === "user_id") {
                  userId = value;
                }
                return this;
              },
              in(field: string, values: string[]) {
                if (field === "data_key") {
                  dataKeys = values;
                }

                return Promise.resolve({
                  data: dataKeys.flatMap((dataKey) => {
                    const stored = rows.get(makeStorageKey(userId, dataKey));
                    return stored === undefined
                      ? []
                      : [{ data_key: dataKey, data_value: stored }];
                  }),
                  error: null,
                });
              },
            };
          }

          throw new Error(`Unexpected select: ${columns}`);
        }),
        upsert: vi.fn(
          async (payload: { user_id: string; data_key: string; data_value: unknown }) => {
            rows.set(makeStorageKey(payload.user_id, payload.data_key), payload.data_value);
            return { error: null };
          },
        ),
        delete: vi.fn(() => {
          let userId = "";

          return {
            eq(field: string, value: string) {
              if (field === "user_id") {
                userId = value;
              }

              return {
                eq: vi.fn(async (nextField: string, nextValue: string) => {
                  if (nextField === "data_key") {
                    rows.delete(makeStorageKey(userId, nextValue));
                  }
                  return { error: null };
                }),
              };
            },
          };
        }),
      };
    }),
  }),
}));

import {
  userDataRepository,
  __resetSessionContextCacheForTests,
} from "@/shared/api/userDataRepository";

beforeEach(() => {
  __resetSessionContextCacheForTests();
  currentUser = null;
  rows = new Map<string, unknown>();
  storedAuthCallback = null;

  getUserSpy.mockReset();
  onAuthStateChangeSpy.mockReset();

  getUserSpy.mockImplementation(async () => ({
    data: { user: currentUser },
    error: null,
  }));

  onAuthStateChangeSpy.mockImplementation((cb: (event: string) => void) => {
    storedAuthCallback = cb;
    return { data: { subscription: { unsubscribe: () => {} } } };
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("userDataRepository — end-to-end (mocked Supabase)", () => {
  it("returns null on get when no user is connected", async () => {
    await expect(userDataRepository.get("missing")).resolves.toBeNull();
  });

  it("persists a value with set and returns it with get", async () => {
    currentUser = { id: "user-1" };
    const value = { nested: ["cardio", "neuro"], ok: true };

    await userDataRepository.set("med-pilot-subjects-v4", value);

    await expect(userDataRepository.get("med-pilot-subjects-v4")).resolves.toEqual(value);
  });

  it("removes a stored value", async () => {
    currentUser = { id: "user-1" };

    await userDataRepository.set("med-pilot-quick-notes", { note: "test" });
    await userDataRepository.remove("med-pilot-quick-notes");

    await expect(userDataRepository.get("med-pilot-quick-notes")).resolves.toBeNull();
  });

  it("returns only existing keys in batchGet", async () => {
    currentUser = { id: "user-1" };

    await userDataRepository.set("albugi-planning-slots", [{ id: "slot-1" }]);
    await userDataRepository.set("dp_chat_history", ["hello"]);

    await expect(
      userDataRepository.batchGet([
        "albugi-planning-slots",
        "albugi-planning-events",
        "dp_chat_history",
      ]),
    ).resolves.toEqual({
      "albugi-planning-slots": [{ id: "slot-1" }],
      dp_chat_history: ["hello"],
    });
  });
});

describe("userDataRepository — auth caching & listener", () => {
  beforeEach(() => {
    currentUser = { id: "user-1" };
  });

  it("calls auth.getUser only once for concurrent reads", async () => {
    await Promise.all([
      userDataRepository.get("k1"),
      userDataRepository.get("k2"),
      userDataRepository.get("k3"),
    ]);
    expect(getUserSpy).toHaveBeenCalledTimes(1);
  });

  it("calls auth.getUser only once across mixed read/write operations", async () => {
    await Promise.all([
      userDataRepository.get("k1"),
      userDataRepository.set("k2", { foo: 1 }),
      userDataRepository.batchGet(["k3", "k4"]),
    ]);
    expect(getUserSpy).toHaveBeenCalledTimes(1);
  });

  it("attaches the auth listener lazily and only once across many calls", async () => {
    await userDataRepository.get("k1");
    await userDataRepository.get("k2");
    await userDataRepository.get("k3");
    expect(onAuthStateChangeSpy).toHaveBeenCalledTimes(1);
  });

  it.each(["SIGNED_OUT", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"])(
    "invalidates the cache on %s",
    async (event) => {
      await userDataRepository.get("k1");
      expect(getUserSpy).toHaveBeenCalledTimes(1);
      expect(storedAuthCallback).not.toBeNull();

      storedAuthCallback!(event);

      await userDataRepository.get("k2");
      expect(getUserSpy).toHaveBeenCalledTimes(2);
    },
  );

  it("ignores unrelated auth events (does not invalidate the cache)", async () => {
    await userDataRepository.get("k1");
    storedAuthCallback!("PASSWORD_RECOVERY");
    await userDataRepository.get("k2");

    expect(getUserSpy).toHaveBeenCalledTimes(1);
  });

  it("clears the cache when auth.getUser rejects so the next call retries", async () => {
    getUserSpy.mockRejectedValueOnce(new Error("network down"));

    const r1 = await userDataRepository.get("k1");
    expect(r1).toBeNull();
    expect(getUserSpy).toHaveBeenCalledTimes(1);

    // Next call should retry — cache was cleared on error
    const r2 = await userDataRepository.get("k2");
    expect(r2).toBeNull(); // no data stored for k2 → null is correct
    expect(getUserSpy).toHaveBeenCalledTimes(2);
  });

  it("clears the cache when auth.getUser resolves with an error", async () => {
    getUserSpy.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "auth_invalid" },
    });
    await userDataRepository.get("k1");
    expect(getUserSpy).toHaveBeenCalledTimes(1);

    // Cache should be cleared → next call retries
    await userDataRepository.get("k2");
    expect(getUserSpy).toHaveBeenCalledTimes(2);
  });

  it("never serves a previous userId after SIGNED_OUT, then a different user signs in", async () => {
    // First user reads
    rows.set(makeStorageKey("user-1", "k1"), "value-of-user-1");
    const r1 = await userDataRepository.get<string>("k1");
    expect(r1).toBe("value-of-user-1");

    // SIGNED_OUT, then a different user logs in
    currentUser = { id: "user-2" };
    storedAuthCallback!("SIGNED_OUT");
    storedAuthCallback!("SIGNED_IN");

    // User 2 reads — should NOT see user-1's value
    const r2 = await userDataRepository.get<string>("k1");
    expect(r2).toBeNull();

    // And reading user-2's own value works
    rows.set(makeStorageKey("user-2", "k1"), "value-of-user-2");
    const r3 = await userDataRepository.get<string>("k1");
    expect(r3).toBe("value-of-user-2");
  });

  it("discards the userId from an auth fetch invalidated mid-flight", async () => {
    // Race scenario the epoch guard protects against:
    //   1. get() triggers fetchSessionContext which awaits auth.getUser
    //   2. SIGNED_OUT lands BEFORE getUser resolves
    //   3. getUser eventually resolves with the now-defunct user-1
    // Without the cacheEpoch check, the stale userId would leak and the
    // read would surface user-1's stored value despite the sign-out.

    rows.set(makeStorageKey("user-1", "k1"), "value-of-user-1");

    // Override getUser with a deferred Promise we control so we can fire
    // SIGNED_OUT in between the call and the resolution.
    let resolveStaleGetUser: (value: {
      data: { user: User };
      error: null;
    }) => void = () => {};
    getUserSpy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveStaleGetUser = resolve;
        }),
    );

    // Kick off the read. fetchSessionContext runs its sync prologue
    // (createClient + ensureAuthListener which registers the callback)
    // then suspends on the deferred getUser.
    const readPromise = userDataRepository.get<string>("k1");
    expect(storedAuthCallback).not.toBeNull();

    // SIGNED_OUT fires BEFORE getUser resolves — bumps cacheEpoch.
    storedAuthCallback!("SIGNED_OUT");

    // The stale getUser then resolves with the now-defunct user-1.
    resolveStaleGetUser({
      data: { user: { id: "user-1" } },
      error: null,
    });

    // Read must NOT return user-1's stored value — the epoch guard makes
    // fetchSessionContext drop the resolved userId and return null.
    await expect(readPromise).resolves.toBeNull();
  });
});
