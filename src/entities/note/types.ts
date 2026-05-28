export type NotePriority = "none" | "low" | "medium" | "high";

export type NotebookIcon =
  | "folder"
  | "user"
  | "briefcase"
  | "book-open"
  | "star";

export type NoteFilter =
  | { type: "all" }
  | { type: "pinned" }
  | { type: "notebook"; id: string }
  | { type: "tag"; id: string };

export interface NoteTag {
  id: string;
  name: string;
  color: string;
}

export interface Notebook {
  id: string;
  name: string;
  icon: NotebookIcon;
  color: string;
}

/**
 * Content is stored as HTML (produced by a contentEditable element using
 * document.execCommand). When you need plain text, run it through `stripHtml`.
 */
export interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  priority: NotePriority;
}

export interface NotesWorkspace {
  notes: Note[];
  notebooks: Notebook[];
  tags: NoteTag[];
  migratedFromQuickNotes?: boolean;
}

export interface LegacyQuickNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}
