// ─── Planning page ───────────────────────────────────────────────────
// Route: /planning — agenda + planification (semaine, mois, recurrent).
// Rend la PlanningView existante telle quelle.

import { PlanningView } from "@/components/views/PlanningView";

export default function PlanningPage() {
    return (
        <div className="h-full">
            <PlanningView />
        </div>
    );
}
