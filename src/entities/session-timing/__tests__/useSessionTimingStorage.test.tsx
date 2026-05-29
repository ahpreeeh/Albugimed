import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSessionTimingStorage } from "@/entities/session-timing/useSessionTimingStorage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getMock, setMock, removeMock, batchGetMock, loadKeyMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  setMock: vi.fn(),
  removeMock: vi.fn(),
  batchGetMock: vi.fn(),
  loadKeyMock: vi.fn(),
}));

vi.mock("@/shared/api/userDataRepository", () => ({
  userDataRepository: {
    get: getMock,
    set: setMock,
    remove: removeMock,
    batchGet: batchGetMock,
  },
}));

vi.mock("@/shared/api/cloudBatchLoader", () => ({
  loadKey: loadKeyMock,
}));

function makeEntry(id: string, chapterId: string, date: string) {
  return {
    taskId: id,
    subjectId: "subject-1",
    chapterId,
    subjectTitle: "Cardio",
    chapterTitle: `Chapitre ${chapterId}`,
    startedAt: `${date}T10:00:00+02:00`,
    completedAt: `${date}T10:45:00+02:00`,
    durationMs: 45 * 60 * 1000,
    date,
  };
}

function Probe({
  name,
  canAdd = false,
}: {
  name: string;
  canAdd?: boolean;
}) {
  const { data, saveWith } = useSessionTimingStorage();

  return (
    <div>
      <div data-testid={`${name}-count`}>{data.length}</div>
      <div data-testid={`${name}-chapters`}>
        {data.map((entry) => entry.chapterId).join(",")}
      </div>
      {canAdd && (
        <button
          type="button"
          onClick={() => saveWith((prev) => [...prev, makeEntry("task-2", "chapter-2", "2026-04-02")])}
        >
          Ajouter
        </button>
      )}
    </div>
  );
}

describe("useSessionTimingStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    getMock.mockResolvedValue(null);
    loadKeyMock.mockResolvedValue(null);
    setMock.mockResolvedValue(undefined);
    removeMock.mockResolvedValue(undefined);
    batchGetMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("synchronizes updates across hook instances in the same page", async () => {
    const user = userEvent.setup();

    render(
      <>
        <Probe name="left" canAdd />
        <Probe name="right" />
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() => {
      expect(screen.getByTestId("left-count")).toHaveTextContent("1");
      expect(screen.getByTestId("right-count")).toHaveTextContent("1");
      expect(screen.getByTestId("right-chapters")).toHaveTextContent("chapter-2");
    });
  });

  it("merges local entries with cloud entries instead of overwriting local history", async () => {
    localStorage.setItem(
      "med-pilot-session-timing",
      JSON.stringify([makeEntry("task-1", "chapter-1", "2026-04-01")]),
    );
    loadKeyMock.mockResolvedValue([makeEntry("task-2", "chapter-2", "2026-04-02")]);

    render(<Probe name="merged" />);

    await waitFor(() => {
      expect(screen.getByTestId("merged-count")).toHaveTextContent("2");
      expect(screen.getByTestId("merged-chapters")).toHaveTextContent(
        "chapter-1,chapter-2",
      );
    });

    await waitFor(() => {
      expect(setMock).toHaveBeenCalledWith(
        "med-pilot-session-timing",
        expect.arrayContaining([
          expect.objectContaining({ chapterId: "chapter-1" }),
          expect.objectContaining({ chapterId: "chapter-2" }),
        ]),
      );
    });
  });
});
