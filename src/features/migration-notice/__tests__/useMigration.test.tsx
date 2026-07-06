import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMigration, type MigrationResult } from "../useMigration";

const supabaseMock = vi.hoisted(() => ({
  existingRows: [] as Array<{ data_key: string }>,
  existingError: null as { message: string } | null,
  upsert: vi.fn(),
  in: vi.fn(),
}));

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          in: supabaseMock.in,
        }),
      }),
      upsert: supabaseMock.upsert,
    }),
  }),
}));

function MigrationProbe({ userId = "user-1" }: { userId?: string | null }) {
  const result = useMigration(userId);
  return <pre data-testid="result">{JSON.stringify(result)}</pre>;
}

function readResult(): MigrationResult {
  return JSON.parse(screen.getByTestId("result").textContent ?? "{}") as MigrationResult;
}

describe("useMigration", () => {
  beforeEach(() => {
    localStorage.clear();
    supabaseMock.existingRows = [];
    supabaseMock.existingError = null;
    supabaseMock.in.mockImplementation(() =>
      Promise.resolve({
        data: supabaseMock.existingRows,
        error: supabaseMock.existingError,
      }),
    );
    supabaseMock.upsert.mockResolvedValue({ error: null });
    supabaseMock.in.mockClear();
    supabaseMock.upsert.mockClear();
  });

  it("n'écrase pas une clé déjà présente dans Supabase", async () => {
    localStorage.setItem(
      "med-pilot-subjects-v4",
      JSON.stringify([{ id: "local-stale", title: "Anciennes matières", chapters: [] }]),
    );
    supabaseMock.existingRows = [{ data_key: "med-pilot-subjects-v4" }];

    render(<MigrationProbe />);

    await waitFor(() => expect(readResult().status).toBe("done"));

    expect(supabaseMock.upsert).not.toHaveBeenCalled();
    expect(readResult().migratedKeys).toEqual([]);
    expect(readResult().skippedKeys).toContain("med-pilot-subjects-v4");
  });

  it("migre seulement les clés absentes du cloud", async () => {
    localStorage.setItem(
      "med-pilot-subjects-v4",
      JSON.stringify([{ id: "cloud-keeps-this", title: "Matières", chapters: [] }]),
    );
    localStorage.setItem(
      "med-pilot-active-strategy",
      JSON.stringify({ mode: "preparation", preparationSubjectIds: [] }),
    );
    supabaseMock.existingRows = [{ data_key: "med-pilot-subjects-v4" }];

    render(<MigrationProbe />);

    await waitFor(() => expect(readResult().status).toBe("done"));

    expect(supabaseMock.upsert).toHaveBeenCalledTimes(1);
    expect(supabaseMock.upsert).toHaveBeenCalledWith(
      [
        {
          user_id: "user-1",
          data_key: "med-pilot-active-strategy",
          data_value: { mode: "preparation", preparationSubjectIds: [] },
        },
      ],
      { onConflict: "user_id,data_key" },
    );
    expect(readResult().migratedKeys).toEqual(["med-pilot-active-strategy"]);
    expect(readResult().skippedKeys).toContain("med-pilot-subjects-v4");
  });
});
