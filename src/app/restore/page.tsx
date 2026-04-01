"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface ChapterStatus {
  t1: boolean;
  annales: boolean;
  t2: boolean;
}

interface BackupChapter {
  id: string;
  title: string;
  status: ChapterStatus;
}

interface BackupSubject {
  id: string;
  title: string;
  iconName: string;
  chapters: BackupChapter[];
  examDate?: string;
  year?: string;
  semester?: string;
}

interface BackupFile {
  version: number;
  exportDate: string;
  data: {
    subjects?: BackupSubject[];
  };
}

function createDefaultProgress() {
  return {
    courseStarted: false,
    level1Done: false,
    reactivationDone: false,
    advancedDone: false,
    firstSeenDate: null,
    lastWorkedDate: null,
    lastTrainingDate: null,
    lastReviewDifficulty: undefined,
    nextReviewDate: null,
  };
}

export default function RestorePage() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<BackupSubject[] | null>(null);
  const [backupData, setBackupData] = useState<BackupSubject[] | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed: BackupFile = JSON.parse(ev.target?.result as string);
        const subjects = parsed?.data?.subjects;
        if (!subjects || !Array.isArray(subjects)) {
          setMessage("❌ Fichier invalide : pas de clé 'subjects' trouvée.");
          return;
        }
        setPreview(subjects);
        setBackupData(subjects);
        setMessage(`✅ ${subjects.length} matières détectées (${subjects.reduce((a, s) => a + s.chapters.length, 0)} chapitres au total)`);
      } catch {
        setMessage("❌ Impossible de parser le JSON.");
      }
    };
    reader.readAsText(file);
  }

  async function handleRestore() {
    if (!backupData) return;

    setStatus("running");
    setMessage("Restauration en cours...");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus("error");
        setMessage("❌ Tu dois être connecté pour restaurer.");
        return;
      }

      // Convertir le format backup → format app (ajouter progress à chaque chapitre)
      const subjects = backupData.map((s) => ({
        ...s,
        chapters: s.chapters.map((ch) => ({
          ...ch,
          progress: createDefaultProgress(),
        })),
      }));

      const { error } = await supabase.from("user_data").upsert(
        { user_id: user.id, data_key: "med-pilot-subjects-v4", data_value: subjects },
        { onConflict: "user_id,data_key" }
      );

      if (error) {
        setStatus("error");
        setMessage(`❌ Erreur Supabase : ${error.message}`);
        return;
      }

      // Mettre à jour localStorage aussi
      localStorage.setItem("med-pilot-subjects-v4", JSON.stringify(subjects));

      setStatus("done");
      setMessage(`✅ ${subjects.length} matières restaurées avec succès dans Supabase et localStorage !`);
    } catch (err) {
      setStatus("error");
      setMessage(`❌ Erreur inattendue : ${err}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-gray-900 rounded-xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Restauration des matières</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Importe un backup JSON et restaure les matières + chapitres dans Supabase.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Fichier backup (.json)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFile}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
          />
        </div>

        {preview && (
          <div className="bg-gray-800 rounded-lg p-4 space-y-1 max-h-48 overflow-y-auto">
            {preview.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-white">{s.title}</span>
                <span className="text-gray-400">{s.chapters.length} chapitres</span>
              </div>
            ))}
          </div>
        )}

        {message && (
          <p className={`text-sm font-medium ${status === "error" ? "text-red-400" : status === "done" ? "text-green-400" : "text-blue-400"}`}>
            {message}
          </p>
        )}

        <button
          onClick={handleRestore}
          disabled={!backupData || status === "running" || status === "done"}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors"
        >
          {status === "running" ? "Restauration..." : status === "done" ? "Restauré !" : "Restaurer dans Supabase"}
        </button>

        {status === "done" && (
          <p className="text-center text-sm text-gray-400">
            Tu peux retourner sur{" "}
            <a href="/" className="text-blue-400 underline">l&apos;accueil</a>
            {" "}— les matières seront rechargées automatiquement.
          </p>
        )}
      </div>
    </div>
  );
}
