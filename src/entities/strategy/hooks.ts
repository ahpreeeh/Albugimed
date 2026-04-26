// ─── Strategy entity — hooks (façade publique) ───────────────────
// Point d'entrée canonique pour les consommateurs React. Ré-exporte
// useStrategy et StrategyProvider depuis StrategyContext.
//
// StrategyContext reste la source réelle (il encapsule useCloudValue
// et expose l'API CRUD). Cette façade découple les imports UI du
// chemin d'implémentation.
//
// Step 2.10 : find-and-replace des 5 consommateurs '@/context/StrategyContext'
// vers '@/entities/strategy/hooks'.

export { useStrategy, StrategyProvider } from './StrategyContext';
