// ─── Root redirect ────────────────────────────────────────────────────
// Route: '/' — redirige vers /cockpit (Server Component).
// L'auth est déjà gérée en amont par le middleware Supabase :
//   - utilisateur non connecté → middleware redirect vers /login
//   - utilisateur connecté    → page atteinte → redirect vers /cockpit
//
// L'ancien switch `useView()` a vécu jusqu'au step 4.4 ; les 4 routes
// `(app)/{cockpit,subjects,planning,simulation}/page.tsx` portent
// maintenant les vues. Le ViewContext sera supprimé au Lot V.

import { redirect } from "next/navigation";

export default function Home() {
    redirect("/cockpit");
}
