// ─── Simulation page ─────────────────────────────────────────────────
// Route: /simulation — simulateur DP (Gemini chat + bank d'erreurs).
// Rend la SimulationView existante telle quelle.

import { SimulationView } from "@/components/views/SimulationView";

export default function SimulationPage() {
    return (
        <div className="h-full">
            <SimulationView />
        </div>
    );
}
