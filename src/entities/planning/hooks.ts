// ─── Planning entity — hooks (façade publique) ──────────────────────
// Point d'entrée canonique pour les consommateurs React.
// Ré-exporte usePlanning + PlanningProvider depuis PlanningContext.
//
// PlanningContext reste la source réelle (il encapsule `useCloudValue`
// qui abstrait déjà la persistance localStorage + cloud). Cette façade
// découple les imports UI du chemin d'implémentation.
//
// Pourquoi pas d'api.ts pour planning ?
// `PlanningContext` consomme directement `useCloudValue` qui est notre
// abstraction propre de persistance (Phase 1 §1.8). Ajouter un api.ts
// dupliquerait cette couche pour aucun gain — contrairement à
// entities/session/ et entities/subject/ qui avaient des accès Supabase
// hand-rolled dans leur context (= duplication réelle à éliminer).
//
// Migration : les ~20 consommateurs `@/context/PlanningContext` seront
// migrés vers cette façade dans les Lots Y → AA quand on cassera
// PlanningView en sous-composants.

export { usePlanning, PlanningProvider } from '@/context/PlanningContext';
