// ─── Cockpit page ────────────────────────────────────────────────────
// Route: /cockpit — premier écran après login (redirect depuis '/').
// Rend la HomeView existante telle quelle. La shell visuelle (TopNav,
// fond, providers) est encore fournie par RootLayout > LayoutShell
// jusqu'au Lot V de Phase 4.

import { HomeView } from "@/components/views/HomeView";

export default function CockpitPage() {
    return (
        <div className="h-full">
            <HomeView />
        </div>
    );
}
