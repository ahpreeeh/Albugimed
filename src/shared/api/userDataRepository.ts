import { createClient } from "@/utils/supabase/client";

type UserDataRow = {
  data_key: string;
  data_value: unknown;
};

function warn(operation: string, error: unknown) {
  console.warn(`[userDataRepository] ${operation}`, error);
}

async function getSessionContext() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      warn("auth.getUser failed", error);
      return { supabase, userId: null as string | null };
    }

    return { supabase, userId: data.user?.id ?? null };
  } catch (error) {
    warn("createClient/getUser failed", error);
    return { supabase: null, userId: null as string | null };
  }
}

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
