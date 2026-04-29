import { beforeEach, describe, expect, it, vi } from "vitest";
import { userDataRepository } from "@/shared/api/userDataRepository";

type User = { id: string } | null;

let currentUser: User = null;
let rows = new Map<string, unknown>();

function makeStorageKey(userId: string, dataKey: string) {
  return `${userId}:${dataKey}`;
}

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: currentUser }, error: null })),
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
        upsert: vi.fn(async (payload: { user_id: string; data_key: string; data_value: unknown }) => {
          rows.set(makeStorageKey(payload.user_id, payload.data_key), payload.data_value);
          return { error: null };
        }),
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

describe("userDataRepository", () => {
  beforeEach(() => {
    currentUser = null;
    rows = new Map<string, unknown>();
    vi.clearAllMocks();
  });

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
