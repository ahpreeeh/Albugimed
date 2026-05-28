"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  BookOpen,
  Bold,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Folder,
  Hash,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Menu,
  MoreHorizontal,
  Pin,
  Plus,
  Quote,
  Redo2,
  Search,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  User,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import { useNotesWorkspace } from "@/entities/note/hooks";
import {
  countWords,
  createNoteRecord,
  filterNotes,
  formatNoteDate,
  formatNoteDateLong,
  getDisplayTitle,
  stripHtml,
} from "@/entities/note/model";
import type {
  Note,
  Notebook,
  NotebookIcon,
  NoteFilter,
  NotePriority,
  NoteTag,
} from "@/entities/note/types";
import { cn } from "@/shared/lib/cn";

// ────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<NotePriority, string> = {
  none: "Aucune",
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
};

const PRIORITY_COLOR: Record<NotePriority, string> = {
  none: "var(--color-text-muted)",
  low: "var(--color-text-muted)",
  medium: "var(--color-priority)",
  high: "var(--color-danger)",
};

const NOTEBOOK_ICONS: Record<NotebookIcon, LucideIcon> = {
  folder: Folder,
  user: User,
  briefcase: Briefcase,
  "book-open": BookOpen,
  star: Star,
};

function filterKey(filter: NoteFilter): string {
  return filter.type === "all" || filter.type === "pinned"
    ? filter.type
    : `${filter.type}:${filter.id}`;
}

// ────────────────────────────────────────────────────────────────
// Popover — tiny click-outside menu (replaces Radix DropdownMenu)
// ────────────────────────────────────────────────────────────────

interface PopoverProps {
  trigger: (props: {
    open: boolean;
    toggle: () => void;
  }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  className?: string;
}

function Popover({ trigger, children, align = "start", className }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={cn(
            "absolute top-full z-30 mt-1 min-w-[10rem] overflow-hidden rounded-lg border bg-[var(--color-bg-card)] py-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
          style={{ borderColor: "var(--color-border-default)" }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function PopoverItem({
  children,
  onSelect,
  className,
}: {
  children: ReactNode;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-[var(--color-accent-muted)]",
        className,
      )}
      style={{ color: "var(--color-text-secondary)" }}
    >
      {children}
    </button>
  );
}

function PopoverSeparator() {
  return (
    <div
      className="my-1 h-px"
      style={{ background: "var(--color-border-default)" }}
    />
  );
}

// ────────────────────────────────────────────────────────────────
// Sidebar
// ────────────────────────────────────────────────────────────────

interface NotesSidebarProps {
  activeFilter: NoteFilter;
  notes: Note[];
  notebooks: Notebook[];
  tags: NoteTag[];
  onFilterChange: (filter: NoteFilter) => void;
  onCreateNotebook: (name: string) => void;
  onNavigate?: () => void;
}

function NotesSidebar({
  activeFilter,
  notes,
  notebooks,
  tags,
  onFilterChange,
  onCreateNotebook,
  onNavigate,
}: NotesSidebarProps) {
  const [notebooksOpen, setNotebooksOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const submittedRef = useRef(false);
  const activeKey = filterKey(activeFilter);
  const pinnedCount = notes.filter((note) => note.pinned).length;

  const submitNotebook = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const trimmed = name.trim();
    if (trimmed) onCreateNotebook(trimmed);

    setName("");
    setCreating(false);
  };

  const handleSelect = (filter: NoteFilter) => {
    onFilterChange(filter);
    onNavigate?.();
  };

  const baseItemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors";

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--color-bg-page)" }}>
      <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto px-2 pt-3 pb-4">
        {/* Toutes les notes */}
        <button
          type="button"
          onClick={() => handleSelect({ type: "all" })}
          className={cn(
            baseItemClass,
            activeKey === "all"
              ? "bg-[var(--color-accent-muted)] font-medium text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-muted)] hover:text-[var(--color-text-primary)]",
          )}
        >
          <FileText
            size={15}
            strokeWidth={1.7}
            style={{
              color:
                activeKey === "all"
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
              flexShrink: 0,
            }}
          />
          <span className="flex-1">Toutes les notes</span>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.62rem",
              color:
                activeKey === "all"
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
            }}
          >
            {notes.length}
          </span>
        </button>

        {/* Épinglées */}
        {pinnedCount > 0 && (
          <button
            type="button"
            onClick={() => handleSelect({ type: "pinned" })}
            className={cn(
              baseItemClass,
              "mt-0.5",
              activeKey === "pinned"
                ? "bg-[var(--color-accent-muted)] font-medium text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-muted)] hover:text-[var(--color-text-primary)]",
            )}
          >
            <Pin
              size={15}
              strokeWidth={1.7}
              style={{
                color:
                  activeKey === "pinned"
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                flexShrink: 0,
              }}
            />
            <span className="flex-1">Épinglées</span>
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.62rem",
                color:
                  activeKey === "pinned"
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
              }}
            >
              {pinnedCount}
            </span>
          </button>
        )}

        {/* CARNETS section */}
        <div className="mt-3 mb-1 flex items-center px-2.5">
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
              color: "var(--color-text-muted)",
            }}
          >
            CARNETS
          </span>
          <button
            type="button"
            onClick={() => setNotebooksOpen((v) => !v)}
            className="ml-auto"
            style={{ color: "var(--color-text-muted)" }}
            aria-label={notebooksOpen ? "Replier" : "Déplier"}
          >
            {notebooksOpen ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        </div>

        {notebooksOpen && (
          <>
            {notebooks.map((notebook) => {
              const Icon = NOTEBOOK_ICONS[notebook.icon] ?? Folder;
              const count = notes.filter(
                (note) => note.notebookId === notebook.id,
              ).length;
              const isActive = activeKey === `notebook:${notebook.id}`;

              return (
                <button
                  key={notebook.id}
                  type="button"
                  onClick={() => handleSelect({ type: "notebook", id: notebook.id })}
                  className={cn(
                    baseItemClass,
                    isActive
                      ? "bg-[var(--color-accent-muted)] font-medium"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-muted)]",
                  )}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: notebook.color }}
                  />
                  <Icon
                    size={13}
                    strokeWidth={1.6}
                    style={{
                      color: isActive ? notebook.color : "var(--color-text-muted)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    className="flex-1 truncate"
                    style={{
                      color: isActive ? "var(--color-text-primary)" : undefined,
                    }}
                  >
                    {notebook.name}
                  </span>
                  {count > 0 && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "0.62rem",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {creating ? (
              <div
                className="mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                style={{
                  border: "1px solid var(--color-accent)",
                  background: "var(--color-accent-muted)",
                }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: "var(--color-text-muted)" }}
                />
                <input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitNotebook();
                    if (event.key === "Escape") {
                      setName("");
                      setCreating(false);
                    }
                  }}
                  onBlur={submitNotebook}
                  placeholder="Nom du carnet…"
                  className="flex-1 border-0 bg-transparent px-0 py-0 text-sm outline-none focus:border-0 focus:shadow-none"
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: "0.8rem",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false);
                    setName("");
                  }}
                >
                  <X size={12} style={{ color: "var(--color-text-muted)" }} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  submittedRef.current = false;
                  setCreating(true);
                }}
                className="mt-0.5 flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--color-accent-muted)]"
                style={{ color: "var(--color-text-muted)" }}
              >
                <Plus size={12} />
                Nouveau carnet
              </button>
            )}
          </>
        )}

        {/* ÉTIQUETTES section */}
        <div className="mt-3 mb-1 flex items-center px-2.5">
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
              color: "var(--color-text-muted)",
            }}
          >
            ÉTIQUETTES
          </span>
          <button
            type="button"
            onClick={() => setTagsOpen((v) => !v)}
            className="ml-auto"
            style={{ color: "var(--color-text-muted)" }}
            aria-label={tagsOpen ? "Replier" : "Déplier"}
          >
            {tagsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        </div>

        {tagsOpen &&
          tags.map((tag) => {
            const isActive = activeKey === `tag:${tag.id}`;
            const count = notes.filter((note) =>
              note.tags.includes(tag.id),
            ).length;

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleSelect({ type: "tag", id: tag.id })}
                className={cn(
                  baseItemClass,
                  isActive
                    ? "bg-[var(--color-accent-muted)] font-medium text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-muted)] hover:text-[var(--color-text-primary)]",
                )}
              >
                <Hash
                  size={13}
                  strokeWidth={1.7}
                  style={{
                    color: isActive ? tag.color : "var(--color-text-muted)",
                    flexShrink: 0,
                  }}
                />
                <span
                  className="flex-1 truncate"
                  style={{
                    color: isActive ? "var(--color-text-primary)" : undefined,
                  }}
                >
                  {tag.name}
                </span>
                {count > 0 && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.62rem",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Note card (list view)
// ────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: Note;
  notebook?: Notebook;
  tags: NoteTag[];
}

function NoteCard({ note, notebook, tags }: NoteCardProps) {
  const preview = stripHtml(note.content);
  const noteTags = note.tags
    .slice(0, 3)
    .map((id) => tags.find((tag) => tag.id === id))
    .filter((tag): tag is NoteTag => Boolean(tag));

  return (
    <Link
      href={`/notes/${note.id}`}
      className="notes-card group flex flex-col overflow-hidden rounded-xl text-left"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border-default)",
        boxShadow: "0 1px 3px rgba(26,37,53,.04)",
      }}
    >
      <div
        className="h-1 w-full shrink-0"
        style={{ background: notebook?.color ?? "var(--color-border-default)" }}
      />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {note.priority !== "none" && (
              <span
                className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: PRIORITY_COLOR[note.priority] }}
              />
            )}
            <h3
              className="line-clamp-2 font-semibold leading-snug"
              style={{
                color: note.title
                  ? "var(--color-text-primary)"
                  : "var(--color-text-muted)",
                fontSize: "0.9rem",
              }}
            >
              {getDisplayTitle(note)}
            </h3>
          </div>
          {note.pinned && (
            <Pin
              size={13}
              strokeWidth={2}
              className="mt-0.5 shrink-0"
              style={{ color: "var(--color-accent)" }}
            />
          )}
        </div>

        {preview && (
          <p
            className="line-clamp-3 flex-1 text-xs leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            {preview}
          </p>
        )}

        {noteTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {noteTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-md px-1.5 py-0.5"
                style={{
                  background: `${tag.color}1c`,
                  color: tag.color,
                  fontSize: "0.62rem",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                #{tag.name}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: "0.62rem",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div
          className="flex items-center justify-between pt-1"
          style={{
            borderTop: "1px solid var(--color-border-default)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.62rem",
            color: "var(--color-text-muted)",
          }}
        >
          <div className="flex min-w-0 items-center gap-1 truncate">
            {notebook && (
              <>
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: notebook.color }}
                />
                <span className="truncate">{notebook.name}</span>
              </>
            )}
          </div>
          <span className="shrink-0">{formatNoteDate(note.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

// ────────────────────────────────────────────────────────────────
// Shared actions
// ────────────────────────────────────────────────────────────────

function useNotesActions() {
  const router = useRouter();
  const { workspace, updateWorkspace, saveState } = useNotesWorkspace();

  const createNote = (filter: NoteFilter = { type: "all" }) => {
    const note = createNoteRecord(workspace, {
      notebookId: filter.type === "notebook" ? filter.id : undefined,
      tagId: filter.type === "tag" ? filter.id : undefined,
    });

    updateWorkspace(
      (current) => ({ ...current, notes: [note, ...current.notes] }),
      { immediate: true },
    );
    router.push(`/notes/${note.id}`);
  };

  const updateNote = (noteId: string, updates: Partial<Note>) => {
    updateWorkspace((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === noteId
          ? { ...note, ...updates, updatedAt: Date.now() }
          : note,
      ),
    }));
  };

  const deleteNote = (noteId: string) => {
    updateWorkspace(
      (current) => ({
        ...current,
        notes: current.notes.filter((note) => note.id !== noteId),
      }),
      { immediate: true },
    );
    router.push("/notes");
  };

  const togglePin = (noteId: string) => {
    updateWorkspace(
      (current) => ({
        ...current,
        notes: current.notes.map((note) =>
          note.id === noteId
            ? { ...note, pinned: !note.pinned, updatedAt: Date.now() }
            : note,
        ),
      }),
      { immediate: true },
    );
  };

  const createNotebook = (name: string) => {
    const palette = ["#5b7fa6", "#4a9e8a", "#cf965d", "#d46e78", "#8a9fb8"];
    const icons: NotebookIcon[] = [
      "folder",
      "briefcase",
      "book-open",
      "user",
      "star",
    ];
    const index = workspace.notebooks.length % palette.length;

    updateWorkspace(
      (current) => ({
        ...current,
        notebooks: [
          ...current.notebooks,
          {
            id: `nb-${Date.now()}`,
            name,
            icon: icons[index],
            color: palette[index],
          },
        ],
      }),
      { immediate: true },
    );
  };

  return {
    workspace,
    saveState,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    createNotebook,
  };
}

// ────────────────────────────────────────────────────────────────
// List workspace
// ────────────────────────────────────────────────────────────────

export function NotesWorkspace() {
  const { workspace, createNote, createNotebook } = useNotesActions();
  const [activeFilter, setActiveFilter] = useState<NoteFilter>({ type: "all" });
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNotes = useMemo(
    () => filterNotes(workspace, activeFilter, search),
    [workspace, activeFilter, search],
  );

  const sectionLabel =
    activeFilter.type === "all"
      ? "Toutes les notes"
      : activeFilter.type === "pinned"
      ? "Épinglées"
      : activeFilter.type === "notebook"
      ? workspace.notebooks.find((nb) => nb.id === activeFilter.id)?.name ?? "Carnet"
      : `#${
          workspace.tags.find((tag) => tag.id === activeFilter.id)?.name ?? ""
        }`;

  return (
    <div className="notes-shell">
      {/* Desktop sidebar */}
      <aside
        className="hidden h-full w-56 shrink-0 md:flex"
        style={{
          borderRight: "1px solid var(--color-border-default)",
          background: "var(--color-bg-page)",
        }}
      >
        <NotesSidebar
          activeFilter={activeFilter}
          notes={workspace.notes}
          notebooks={workspace.notebooks}
          tags={workspace.tags}
          onFilterChange={setActiveFilter}
          onCreateNotebook={createNotebook}
        />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <aside
            className="absolute inset-y-0 left-0 w-64 max-w-[85vw]"
            onClick={(event) => event.stopPropagation()}
            style={{
              borderRight: "1px solid var(--color-border-default)",
              background: "var(--color-bg-page)",
            }}
          >
            <NotesSidebar
              activeFilter={activeFilter}
              notes={workspace.notes}
              notebooks={workspace.notebooks}
              tags={workspace.tags}
              onFilterChange={setActiveFilter}
              onCreateNotebook={createNotebook}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div
          className="flex shrink-0 items-center gap-3 px-5 py-3.5"
          style={{
            background: "var(--color-bg-card)",
            borderBottom: "1px solid var(--color-border-default)",
          }}
        >
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-accent-muted)] md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu
              size={18}
              strokeWidth={1.8}
              style={{ color: "var(--color-text-secondary)" }}
            />
          </button>

          <div>
            <h1
              className="font-semibold"
              style={{
                fontSize: "1rem",
                color: "var(--color-text-primary)",
                lineHeight: 1.2,
              }}
            >
              {sectionLabel}
            </h1>
            <p
              className="text-xs"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "var(--color-text-muted)",
              }}
            >
              {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Search */}
          <div className="relative ml-auto max-w-sm flex-1">
            <Search
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--color-text-muted)" }}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-lg py-2 pl-8 pr-7 text-sm outline-none transition-all"
              style={{
                background: "var(--color-bg-page)",
                borderColor: search
                  ? "var(--color-accent)"
                  : "var(--color-border-default)",
                color: "var(--color-text-primary)",
                fontSize: "0.82rem",
                minHeight: 0,
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2"
              >
                <X size={12} style={{ color: "var(--color-text-muted)" }} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => createNote(activeFilter)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium transition-all hover:opacity-90"
            style={{
              background: "var(--color-accent)",
              color: "#fff",
              fontSize: "0.82rem",
            }}
          >
            <Plus size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Nouvelle note</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>

        {/* Grid */}
        <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <EmptyState onCreateNote={() => createNote(activeFilter)} />
          ) : (
            <div
              className="p-5"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "12px",
                alignItems: "start",
              }}
            >
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  notebook={workspace.notebooks.find(
                    (notebook) => notebook.id === note.notebookId,
                  )}
                  tags={workspace.tags}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ onCreateNote }: { onCreateNote: () => void }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-5 py-20"
      style={{ color: "var(--color-text-muted)" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "var(--color-accent-muted)" }}
      >
        <Folder
          size={28}
          strokeWidth={1.2}
          style={{ color: "var(--color-accent)" }}
        />
      </div>
      <div className="text-center">
        <p
          className="mb-1 text-sm font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Aucune note ici
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Créez votre première note pour commencer
        </p>
      </div>
      <button
        type="button"
        onClick={onCreateNote}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all hover:opacity-90"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        <Plus size={14} />
        Nouvelle note
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Editor workspace
// ────────────────────────────────────────────────────────────────

interface NoteEditorWorkspaceProps {
  noteId: string;
}

export function NoteEditorWorkspace({ noteId }: NoteEditorWorkspaceProps) {
  const router = useRouter();
  const { workspace, updateNote, deleteNote, togglePin } = useNotesActions();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const prevIdRef = useRef<string | null>(null);

  const note = workspace.notes.find((entry) => entry.id === noteId) ?? null;

  // Sync editor HTML when switching notes
  useEffect(() => {
    if (!editorRef.current || !note) return;
    if (prevIdRef.current !== note.id) {
      editorRef.current.innerHTML = note.content || "";
      prevIdRef.current = note.id;
    }
  }, [note]);

  const handleBack = useCallback(() => {
    router.push("/notes");
  }, [router]);

  if (!note) {
    return (
      <div
        className="notes-shell flex items-center justify-center"
        style={{ background: "var(--color-bg-card)" }}
      >
        <div className="text-center">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--color-text-muted)" }}
          >
            Note introuvable
          </p>
          <button
            type="button"
            onClick={handleBack}
            className="mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all hover:opacity-90"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            <ArrowLeft size={14} />
            Retour aux notes
          </button>
        </div>
      </div>
    );
  }

  const notebook = workspace.notebooks.find(
    (entry) => entry.id === note.notebookId,
  );
  const activeTagIds = new Set(note.tags);
  const noteTags = note.tags
    .map((id) => workspace.tags.find((tag) => tag.id === id))
    .filter((tag): tag is NoteTag => Boolean(tag));
  const availableTags = workspace.tags.filter((tag) => !activeTagIds.has(tag.id));

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      updateNote(note.id, { content: editorRef.current.innerHTML });
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      updateNote(note.id, { content: editorRef.current.innerHTML });
    }
  };

  const toggleTag = (tagId: string) => {
    updateNote(note.id, {
      tags: note.tags.includes(tagId)
        ? note.tags.filter((id) => id !== tagId)
        : [...note.tags, tagId],
    });
  };

  const handleDelete = () => {
    if (window.confirm(`Supprimer "${getDisplayTitle(note)}" ?`)) {
      deleteNote(note.id);
    }
  };

  const words = countWords(`${note.title} ${note.content}`);

  return (
    <div
      className="notes-shell flex-col"
      style={{ background: "var(--color-bg-card)" }}
    >
      {/* Top bar */}
      <div
        className="flex shrink-0 items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid var(--color-border-default)" }}
      >
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--color-accent-muted)]"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
          <span
            className="hidden text-xs sm:inline"
            style={{ color: "var(--color-text-muted)" }}
          >
            Retour
          </span>
        </button>

        {/* Notebook breadcrumb */}
        <Popover
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--color-accent-muted)]"
              style={{
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-mono), monospace",
                fontSize: "0.72rem",
              }}
            >
              {notebook && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: notebook.color }}
                />
              )}
              <span>{notebook?.name ?? "Carnet"}</span>
              <ChevronDown size={10} strokeWidth={2} />
            </button>
          )}
        >
          {(close) =>
            workspace.notebooks.map((nb) => (
              <PopoverItem
                key={nb.id}
                onSelect={() => {
                  updateNote(note.id, { notebookId: nb.id });
                  close();
                }}
                className={note.notebookId === nb.id ? "font-medium" : ""}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: nb.color }}
                />
                {nb.name}
              </PopoverItem>
            ))
          }
        </Popover>

        <div className="flex-1" />

        {/* Pin */}
        <button
          type="button"
          onClick={() => togglePin(note.id)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            note.pinned
              ? "bg-[var(--color-accent-muted)]"
              : "hover:bg-[var(--color-accent-muted)]",
          )}
          title={note.pinned ? "Désépingler" : "Épingler"}
        >
          <Pin
            size={14}
            strokeWidth={2}
            style={{
              color: note.pinned
                ? "var(--color-accent)"
                : "var(--color-text-muted)",
            }}
          />
        </button>

        {/* More menu */}
        <Popover
          align="end"
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-accent-muted)]"
              title="Plus d'options"
            >
              <MoreHorizontal
                size={15}
                strokeWidth={1.8}
                style={{ color: "var(--color-text-muted)" }}
              />
            </button>
          )}
        >
          {(close) => (
            <>
              <PopoverItem
                onSelect={() => {
                  togglePin(note.id);
                  close();
                }}
              >
                <Pin size={13} />
                {note.pinned ? "Désépingler" : "Épingler"}
              </PopoverItem>
              <PopoverSeparator />
              {(["low", "medium", "high", "none"] as NotePriority[]).map((p) => (
                <PopoverItem
                  key={p}
                  onSelect={() => {
                    updateNote(note.id, { priority: p });
                    close();
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: PRIORITY_COLOR[p] }}
                  />
                  <span className="flex-1">Priorité {PRIORITY_LABEL[p]}</span>
                  {note.priority === p && (
                    <span style={{ color: "var(--color-accent)" }}>✓</span>
                  )}
                </PopoverItem>
              ))}
              <PopoverSeparator />
              <PopoverItem
                onSelect={() => {
                  close();
                  handleDelete();
                }}
                className="!text-[var(--color-danger)] hover:!bg-[var(--color-danger-muted)]"
              >
                <Trash2 size={13} />
                Supprimer la note
              </PopoverItem>
            </>
          )}
        </Popover>
      </div>

      {/* Toolbar */}
      <div
        className="flex shrink-0 items-center gap-0.5 overflow-x-auto px-4 py-1.5"
        style={{
          borderBottom: "1px solid var(--color-border-default)",
          background: "var(--color-bg-page)",
        }}
      >
        <ToolButton onAction={() => exec("bold")} title="Gras">
          <Bold size={13} strokeWidth={2.2} />
        </ToolButton>
        <ToolButton onAction={() => exec("italic")} title="Italique">
          <Italic size={13} />
        </ToolButton>
        <ToolButton onAction={() => exec("underline")} title="Souligné">
          <Underline size={13} />
        </ToolButton>
        <ToolButton onAction={() => exec("strikeThrough")} title="Barré">
          <Strikethrough size={13} />
        </ToolButton>
        <ToolDivider />
        <ToolButton
          onAction={() => exec("formatBlock", "h1")}
          title="Titre 1"
        >
          <Heading1 size={14} strokeWidth={1.8} />
        </ToolButton>
        <ToolButton
          onAction={() => exec("formatBlock", "h2")}
          title="Titre 2"
        >
          <Heading2 size={14} strokeWidth={1.8} />
        </ToolButton>
        <ToolDivider />
        <ToolButton
          onAction={() => exec("insertUnorderedList")}
          title="Liste à puces"
        >
          <List size={14} strokeWidth={1.8} />
        </ToolButton>
        <ToolButton
          onAction={() => exec("insertOrderedList")}
          title="Liste numérotée"
        >
          <ListOrdered size={14} strokeWidth={1.8} />
        </ToolButton>
        <ToolDivider />
        <ToolButton
          onAction={() => exec("formatBlock", "blockquote")}
          title="Citation"
        >
          <Quote size={13} strokeWidth={1.8} />
        </ToolButton>
        <ToolButton
          onAction={() => exec("formatBlock", "pre")}
          title="Bloc de code"
        >
          <Code2 size={13} strokeWidth={1.8} />
        </ToolButton>
        <ToolDivider />
        <ToolButton onAction={() => exec("undo")} title="Annuler">
          <Undo2 size={13} strokeWidth={1.8} />
        </ToolButton>
        <ToolButton onAction={() => exec("redo")} title="Rétablir">
          <Redo2 size={13} strokeWidth={1.8} />
        </ToolButton>
      </div>

      {/* Title */}
      <div className="px-8 pt-7 shrink-0">
        <input
          value={note.title}
          onChange={(event) =>
            updateNote(note.id, { title: event.target.value })
          }
          placeholder="Titre de la note"
          className="w-full border-0 bg-transparent px-0 py-0 outline-none placeholder:text-[var(--color-text-muted)] focus:border-0 focus:shadow-none"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: note.title
              ? "var(--color-text-primary)"
              : "var(--color-text-muted)",
            lineHeight: 1.25,
          }}
        />
        <div
          className="mt-3"
          style={{ height: "1px", background: "var(--color-border-default)" }}
        />
      </div>

      {/* Content (contentEditable) */}
      <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
          data-placeholder="Commencez à écrire…"
          className="notes-editor min-h-full px-8 py-5"
          style={{ fontSize: "0.92rem", minHeight: "300px" }}
        />
      </div>

      {/* Footer */}
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-4 px-8 py-3"
        style={{ borderTop: "1px solid var(--color-border-default)" }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {noteTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="group flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors"
              style={{
                background: `${tag.color}1c`,
                color: tag.color,
                fontSize: "0.7rem",
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              #{tag.name}
              <X
                size={9}
                className="opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          ))}

          {availableTags.length > 0 && (
            <Popover
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors hover:bg-[var(--color-accent-muted)]"
                  style={{
                    border: "1px dashed var(--color-border-default)",
                    color: "var(--color-text-muted)",
                    fontSize: "0.7rem",
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  <Plus size={9} /> étiquette
                </button>
              )}
            >
              {(close) =>
                availableTags.map((tag) => (
                  <PopoverItem
                    key={tag.id}
                    onSelect={() => {
                      toggleTag(tag.id);
                      close();
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: tag.color }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "0.8rem",
                      }}
                    >
                      #{tag.name}
                    </span>
                  </PopoverItem>
                ))
              }
            </Popover>
          )}
        </div>

        <div
          className="ml-auto flex items-center gap-2"
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "var(--color-text-muted)",
            fontSize: "0.62rem",
          }}
        >
          <span>
            {words} mot{words > 1 ? "s" : ""}
          </span>
          <span style={{ color: "var(--color-border-default)" }}>·</span>
          <span>modifiée {formatNoteDateLong(note.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Toolbar primitives
// ────────────────────────────────────────────────────────────────

function ToolButton({
  onAction,
  title,
  children,
}: {
  onAction: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => {
        event.preventDefault();
        onAction();
      }}
      className="editor-tool"
    >
      {children}
    </button>
  );
}

function ToolDivider() {
  return (
    <div
      className="mx-1 h-4 w-px shrink-0"
      style={{ background: "var(--color-border-default)" }}
    />
  );
}
