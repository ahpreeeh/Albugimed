import type {
  LegacyQuickNote,
  Note,
  Notebook,
  NoteFilter,
  NotePriority,
  NotebookIcon,
  NotesWorkspace,
  NoteTag,
} from "./types";

/**
 * Default notebooks + tags — match the Figma reference
 * (Personnel / Travail / Lectures / Projets).
 */
export const DEFAULT_NOTEBOOKS: Notebook[] = [
  { id: "nb-personnel", name: "Personnel", icon: "user", color: "#5b7fa6" },
  { id: "nb-travail", name: "Travail", icon: "briefcase", color: "#4a9e8a" },
  { id: "nb-lectures", name: "Lectures", icon: "book-open", color: "#cf965d" },
  { id: "nb-projets", name: "Projets", icon: "folder", color: "#8a9fb8" },
];

export const DEFAULT_NOTE_TAGS: NoteTag[] = [
  { id: "tag-urgent", name: "urgent", color: "#d46e78" },
  { id: "tag-idees", name: "idées", color: "#5b7fa6" },
  { id: "tag-projet", name: "projet", color: "#4a9e8a" },
  { id: "tag-lecture", name: "lecture", color: "#cf965d" },
  { id: "tag-personnel", name: "personnel", color: "#8a9fb8" },
];

const NOTEBOOK_ICONS: readonly NotebookIcon[] = [
  "folder",
  "user",
  "briefcase",
  "book-open",
  "star",
];

const PRIORITY_ORDER: Record<NotePriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function copyNotebook(notebook: Notebook): Notebook {
  return { ...notebook };
}

function copyTag(tag: NoteTag): NoteTag {
  return { ...tag };
}

export function createDefaultNotesWorkspace(): NotesWorkspace {
  return {
    notes: [],
    notebooks: DEFAULT_NOTEBOOKS.map(copyNotebook),
    tags: DEFAULT_NOTE_TAGS.map(copyTag),
    migratedFromQuickNotes: false,
  };
}

function normalizeTimestamp(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizePriority(value: unknown): NotePriority {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }

  return "none";
}

function normalizeIcon(value: unknown): NotebookIcon {
  return NOTEBOOK_ICONS.includes(value as NotebookIcon)
    ? (value as NotebookIcon)
    : "folder";
}

function normalizeNotebook(value: unknown): Notebook | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const color = typeof value.color === "string" ? value.color : "#5b7fa6";

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    color,
    icon: normalizeIcon(value.icon),
  };
}

function normalizeTag(value: unknown): NoteTag | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const color = typeof value.color === "string" ? value.color : "#5b7fa6";

  if (!id || !name) {
    return null;
  }

  return { id, name, color };
}

function normalizeNote(value: unknown, fallbackNotebookId: string): Note | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  if (!id) {
    return null;
  }

  const now = Date.now();
  const createdAt = normalizeTimestamp(value.createdAt, now);
  const updatedAt = normalizeTimestamp(value.updatedAt, createdAt);

  return {
    id,
    notebookId:
      typeof value.notebookId === "string" && value.notebookId.trim()
        ? value.notebookId
        : fallbackNotebookId,
    title: typeof value.title === "string" ? value.title : "",
    content: typeof value.content === "string" ? value.content : "",
    tags: Array.isArray(value.tags)
      ? value.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    createdAt,
    updatedAt,
    pinned: value.pinned === true,
    priority: normalizePriority(value.priority),
  };
}

export function normalizeNotesWorkspace(value: unknown): NotesWorkspace {
  const defaults = createDefaultNotesWorkspace();

  if (!isRecord(value)) {
    return defaults;
  }

  const notebooks = Array.isArray(value.notebooks)
    ? value.notebooks
        .map(normalizeNotebook)
        .filter((notebook): notebook is Notebook => notebook !== null)
    : [];
  const tags = Array.isArray(value.tags)
    ? value.tags.map(normalizeTag).filter((tag): tag is NoteTag => tag !== null)
    : [];

  const safeNotebooks = notebooks.length > 0 ? notebooks : defaults.notebooks;
  const safeTags = tags.length > 0 ? tags : defaults.tags;
  const notebookIds = new Set(safeNotebooks.map((notebook) => notebook.id));
  const tagIds = new Set(safeTags.map((tag) => tag.id));
  const fallbackNotebookId = safeNotebooks[0]?.id ?? "nb-personnel";

  const notes = Array.isArray(value.notes)
    ? value.notes
        .map((note) => normalizeNote(note, fallbackNotebookId))
        .filter((note): note is Note => note !== null)
        .map((note) => ({
          ...note,
          notebookId: notebookIds.has(note.notebookId)
            ? note.notebookId
            : fallbackNotebookId,
          tags: note.tags.filter((tagId) => tagIds.has(tagId)),
        }))
    : [];

  return {
    notes,
    notebooks: safeNotebooks,
    tags: safeTags,
    migratedFromQuickNotes: value.migratedFromQuickNotes === true,
  };
}

export function makeNoteId(now = Date.now()): string {
  return `note-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createNoteRecord(
  workspace: NotesWorkspace,
  options: { notebookId?: string; tagId?: string; now?: number } = {},
): Note {
  const now = options.now ?? Date.now();
  const notebookId =
    options.notebookId ??
    workspace.notebooks[0]?.id ??
    DEFAULT_NOTEBOOKS[0].id;

  return {
    id: makeNoteId(now),
    notebookId,
    title: "",
    content: "",
    tags: options.tagId ? [options.tagId] : [],
    createdAt: now,
    updatedAt: now,
    pinned: false,
    priority: "none",
  };
}

/** Strip HTML tags and collapse whitespace — useful for previews/word counts. */
export function stripHtml(content: string): string {
  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Backwards-compat alias used by older callers (now identical to stripHtml). */
export const stripNoteText = stripHtml;

export function deriveNoteTitle(content: string): string {
  // Replace HTML tags with newlines so block elements become line breaks,
  // then pick the first non-empty trimmed line.
  const withoutTags = content.replace(/<[^>]*>/g, "\n");
  const firstLine = withoutTags
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "";
  }

  return firstLine.length > 64 ? `${firstLine.slice(0, 64)}...` : firstLine;
}

export function getDisplayTitle(note: Note): string {
  return note.title.trim() || deriveNoteTitle(note.content) || "Sans titre";
}

export function countWords(content: string): number {
  const text = stripHtml(content);
  return text ? text.split(" ").filter(Boolean).length : 0;
}

const SHORT_DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

const LONG_DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Short relative date for note cards.
 * Matches the Figma reference: "il y a moins d'une minute" / "hier" / "26 mai".
 */
export function formatNoteDate(timestamp: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - timestamp);
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "il y a moins d'une minute";
  if (diffMin < 60) return `il y a ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} j`;

  return SHORT_DATE_FMT.format(new Date(timestamp));
}

/** Long form used in the editor footer: "28 mai à 20:16". */
export function formatNoteDateLong(timestamp: number): string {
  return LONG_DATE_FMT.format(new Date(timestamp)).replace(/, /, " à ");
}

export function filterNotes(
  workspace: NotesWorkspace,
  filter: NoteFilter,
  search: string,
): Note[] {
  const query = search.trim().toLowerCase();

  return workspace.notes
    .filter((note) => {
      if (filter.type === "pinned" && !note.pinned) return false;
      if (filter.type === "notebook" && note.notebookId !== filter.id) return false;
      if (filter.type === "tag" && !note.tags.includes(filter.id)) return false;

      if (!query) return true;

      return (
        note.title.toLowerCase().includes(query) ||
        stripHtml(note.content).toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.priority !== b.priority) {
        return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      }
      return b.updatedAt - a.updatedAt;
    });
}

/**
 * Wrap a legacy plain-text quick-note as HTML so it renders correctly in
 * the contentEditable editor. Each line becomes a `<p>`.
 */
function legacyTextToHtml(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function convertLegacyQuickNotes(
  legacyNotes: LegacyQuickNote[],
  workspace: NotesWorkspace,
): Note[] {
  const notebookId = workspace.notebooks[0]?.id ?? DEFAULT_NOTEBOOKS[0].id;

  return legacyNotes
    .filter((note) => note.content?.trim())
    .map((note) => {
      const updatedAt = normalizeTimestamp(note.updatedAt, Date.now());
      return {
        id: `legacy-${note.id || updatedAt}`,
        notebookId,
        title: note.title || deriveNoteTitle(note.content),
        content: legacyTextToHtml(note.content),
        tags: [],
        createdAt: updatedAt,
        updatedAt,
        pinned: false,
        priority: "none",
      };
    });
}
