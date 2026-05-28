import { describe, expect, it } from "vitest";
import {
  convertLegacyQuickNotes,
  countWords,
  createDefaultNotesWorkspace,
  createNoteRecord,
  deriveNoteTitle,
  filterNotes,
  formatNoteDate,
  normalizeNotesWorkspace,
} from "../model";
import type { Note } from "../types";

describe("note model", () => {
  it("normalizes invalid workspace data to safe defaults", () => {
    const workspace = normalizeNotesWorkspace({ notes: "bad" });

    expect(workspace.notes).toEqual([]);
    expect(workspace.notebooks.length).toBeGreaterThan(0);
    expect(workspace.tags.length).toBeGreaterThan(0);
  });

  it("creates an empty note in the requested notebook", () => {
    const workspace = createDefaultNotesWorkspace();
    const note = createNoteRecord(workspace, {
      notebookId: "nb-travail",
      tagId: "tag-projet",
      now: 1000,
    });

    expect(note.notebookId).toBe("nb-travail");
    expect(note.tags).toEqual(["tag-projet"]);
    expect(note.createdAt).toBe(1000);
    expect(note.updatedAt).toBe(1000);
  });

  it("derives a title from the first non-empty line", () => {
    expect(deriveNoteTitle("\n\n  Premiere ligne\nDeuxieme")).toBe(
      "Premiere ligne",
    );
  });

  it("strips HTML when deriving the title", () => {
    expect(deriveNoteTitle("<h2>Titre HTML</h2><p>Corps</p>")).toBe(
      "Titre HTML",
    );
  });

  it("counts words after whitespace normalization", () => {
    expect(countWords("Un   deux\n trois")).toBe(3);
  });

  it("filters and sorts pinned notes first", () => {
    const base = createDefaultNotesWorkspace();
    const old: Note = {
      id: "old",
      notebookId: "nb-personnel",
      title: "Ancienne",
      content: "",
      tags: [],
      createdAt: 1,
      updatedAt: 1,
      pinned: false,
      priority: "none",
    };
    const pinned: Note = {
      ...old,
      id: "pinned",
      title: "Epinglee",
      updatedAt: 0,
      pinned: true,
    };

    const results = filterNotes(
      { ...base, notes: [old, pinned] },
      { type: "all" },
      "",
    );

    expect(results.map((note) => note.id)).toEqual(["pinned", "old"]);
  });

  it("formats recent dates with short French labels", () => {
    expect(formatNoteDate(0, 30 * 1000)).toBe("il y a moins d'une minute");
    expect(formatNoteDate(0, 5 * 60 * 1000)).toBe("il y a 5 min");
    expect(formatNoteDate(0, 2 * 60 * 60 * 1000)).toBe("il y a 2 h");
    expect(formatNoteDate(0, 25 * 60 * 60 * 1000)).toBe("hier");
  });

  it("converts legacy quick notes into workspace notes as HTML", () => {
    const workspace = createDefaultNotesWorkspace();
    const notes = convertLegacyQuickNotes(
      [{ id: "1", title: "Memo", content: "Corps", updatedAt: 1000 }],
      workspace,
    );

    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe("legacy-1");
    expect(notes[0].title).toBe("Memo");
    expect(notes[0].content).toContain("<p>Corps</p>");
  });
});
