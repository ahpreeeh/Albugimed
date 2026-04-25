// ─── Subjects page ───────────────────────────────────────────────────
// Route: /subjects — gestion des matières et chapitres.
// Rend la SubjectsView existante telle quelle.

import { SubjectsView } from "@/components/views/SubjectsView";

export default function SubjectsPage() {
    return (
        <div className="h-full">
            <SubjectsView />
        </div>
    );
}
