// ─── Cockpit page ────────────────────────────────────────────────────
// Route: /cockpit — premier écran après login (redirect depuis '/').
// Rend la HomeView existante telle quelle. La shell visuelle (TopNav,
// fond, MigrationRunner) vient du layout du groupe `(app)/layout.tsx`.
// Les providers vivent un cran au-dessus, dans `app/providers.tsx` au
// RootLayout, donc traversent les navigations entre routes sans
// remontage.

import { HomeView } from "@/components/views/HomeView";

export default function CockpitPage() {
    return (
        <div className="h-full">
            <HomeView />
        </div>
    );
}
