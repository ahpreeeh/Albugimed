import { NoteEditorWorkspace } from "@/features/notes/NotesWorkspace";

interface NoteEditorPageProps {
  params: {
    noteId: string;
  };
}

export default function NoteEditorPage({ params }: NoteEditorPageProps) {
  return <NoteEditorWorkspace noteId={params.noteId} />;
}
