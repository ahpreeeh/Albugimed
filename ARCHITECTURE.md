# AlbugiMed — Architecture

Application Next.js 14 (App Router) qui aide les étudiants en médecine à se préparer aux EDN. Cette page décrit comment le code est organisé et les règles à respecter pour ajouter une feature, une route ou une entité.

## 1. Les 4 couches

```
┌────────────────────────────────────────────────────────┐
│  app/         routes Next.js + providers + layouts     │  ← top
├────────────────────────────────────────────────────────┤
│  features/    cas d'usage UI composés (vues utilisateur)│
├────────────────────────────────────────────────────────┤
│  entities/    domaines métier (types + logique + state) │
├────────────────────────────────────────────────────────┤
│  shared/      utilitaires sans contexte métier          │  ← bas
└────────────────────────────────────────────────────────┘
```

Inspiration : **FSD allégée** (Feature-Sliced Design). Une couche ne peut consommer que des couches **strictement plus basses**.

| Couche       | Rôle                                                                                       | Exemples                                                              |
|--------------|--------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| `app/`       | Routes Next.js, layouts, providers React au root. Aucune logique métier ici.               | `app/(app)/cockpit/page.tsx`, `app/providers.tsx`                     |
| `features/`  | Composants UI composés autour d'un cas d'usage (un panneau, un widget, un dialogue).       | `features/session-widget/`, `features/error-panel/`                   |
| `entities/`  | Domaines métier — types + logique pure + persistance + hooks React + (parfois) Context.   | `entities/session/`, `entities/simulation/`                           |
| `shared/`    | Utilitaires et adaptateurs sans connaissance du métier.                                    | `shared/api/userDataRepository.ts`, `shared/lib/cn.ts`                |

## 2. Règle d'import

```
app      → features, entities, shared
features → entities, shared          (jamais app, jamais autre features)
entities → shared                    (jamais features, jamais app)
shared   → ∅                         (rien d'autre)
```

Import croisé entre deux features = signal qu'il faut extraire la partie partagée vers une **entity** ou vers `shared/`.

## 3. Anatomie d'une `entity`

Une entity est un dossier `src/entities/<nom>/` qui peut contenir :

```
entities/<nom>/
├── types.ts        # interfaces du domaine, exportées
├── model.ts        # logique pure (sans React, sans I/O) + tests purs
├── api.ts          # I/O Supabase via shared/api/userDataRepository
├── hooks.ts        # facade React publique (useX, XProvider, ...)
├── <Nom>Context.tsx (optionnel) si l'état est partagé via React Context
└── __tests__/
```

**`model.ts` est le cœur testable** : chaque fonction est pure, sans dépendance React ni Supabase. Les tests Vitest vivent à côté dans `__tests__/`.

`api.ts` ne contient **jamais** d'appel direct à `createClient()` Supabase — il passe systématiquement par `shared/api/userDataRepository`.

`hooks.ts` est la **seule API publique** que les features consomment. Les features n'importent **jamais** `model.ts` ou `api.ts` directement.

## 4. Persistance : `userDataRepository`

Toutes les écritures cloud passent par un seul module :

```ts
// shared/api/userDataRepository.ts
userDataRepository.get<T>(key)
userDataRepository.set(key, value)
userDataRepository.remove(key)
userDataRepository.batchGet(keys[])
```

- Cible : table `user_data` Supabase, scopée par `user_id`
- Les **clés** (`med-pilot-*`, `albugi-*`, `dp_*`) sont centralisées dans `shared/config/storageKeys.ts`
- Aucun composant n'appelle directement `supabase.from('user_data')` — chaque entity a son `api.ts` qui sérialise/valide

Pour un état React qui doit être persisté côté serveur, `shared/hooks/useCloudValue.ts` enveloppe `userDataRepository` derrière une API style `{ data, save, saveWith, clear, isReady }`.

## 5. Tests

| Type                          | Outil   | Localisation                                  |
|-------------------------------|---------|-----------------------------------------------|
| Logique pure (`model.ts`)     | Vitest  | `entities/<nom>/__tests__/model.test.ts`      |
| Hooks (intégration légère)    | Vitest + React Testing Library | `entities/<nom>/__tests__/<hook>.test.tsx` |
| Composants features           | RTL     | `features/<nom>/__tests__/`                   |

Les tests de `model.ts` couvrent les invariants métier (séquencement des tâches, validation, calcul de progression). Les tests de hooks utilisent `vi.hoisted` pour mocker `userDataRepository`.

Lancer la suite : `npm test`. La cible actuelle est de **ne jamais merger un commit qui casse `npm test` ou `npm run build`**.

## 6. Templates

### Ajouter un widget de cockpit

1. Créer `src/features/<widget-name>/` avec le composant principal `<WidgetName>.tsx`
2. Si le widget consomme un domaine, importer via `@/entities/<nom>/hooks`
3. Référencer le widget dans `src/app/(app)/cockpit/page.tsx`

### Ajouter une route

1. Créer `src/app/(app)/<route>/page.tsx` (Client Component si besoin d'interactivité — `"use client"`)
2. La page peut composer un ou plusieurs `features/`
3. Si la route a besoin de providers spécifiques, les injecter dans le composant lui-même (ne **pas** ajouter au root sauf raison majeure)

### Ajouter une entity

1. Créer `src/entities/<nom>/` avec `types.ts`, `model.ts` (+ `__tests__/model.test.ts`)
2. Si persistance Supabase : ajouter la clé dans `shared/config/storageKeys.ts` puis créer `api.ts`
3. Si état React partagé : créer `<Nom>Context.tsx` puis `hooks.ts` qui en re-exporte
4. Brancher le `Provider` dans `src/app/providers.tsx`
5. Toute consommation extérieure passe par `@/entities/<nom>/hooks`

## 7. État React et providers

- **`SessionEngine`** est en **Zustand** (un store global) — c'est le seul cas où Zustand est utilisé. Voir `entities/session/store.ts`.
- **Tout le reste** utilise React Context : `EventProvider`, `PlanningProvider`, `StrategyProvider`, `SubjectProvider` (chacun colocalisé dans son entity), plus `ThemeProvider` (`src/context/ThemeContext.tsx`, isolé car cross-cutting UI).
- Les providers sont composés dans `src/app/providers.tsx` et montés dans `src/app/layout.tsx`.

## 8. Server vs Client

Quasi tout est Client. Seul `app/layout.tsx` (root layout Next.js) reste Server. Les routes elles-mêmes sont **Client Components** (`"use client"`) parce qu'elles consomment des Context providers et des hooks de stockage cloud.

## 9. Pour aller plus loin

Référence détaillée du refactor qui a produit cette architecture : [`docs/REFACTOR_PLAN.md`](docs/REFACTOR_PLAN.md). Statut courant et historique des phases : [`docs/REFACTOR_HANDOFF.md`](docs/REFACTOR_HANDOFF.md).
