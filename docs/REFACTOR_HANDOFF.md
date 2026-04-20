# AlbugiMed — Refactor Handoff (état courant)

> **État réel du refactor.** Document vivant, mis à jour après chaque lot d'étapes validé. Couplé à `REFACTOR_PLAN.md` qui est la référence figée.

**Dernière mise à jour** : 2026-04-20 (Phase 3 en cours — step 3.7 codé, smoke test Q requis)
**Mise à jour par** : Codex (session interactive, audit + reprise semi-autonome)

---

## 1. Snapshot git

| Champ | Valeur |
|---|---|
| Branche courante | `refactor/architecture-v2` |
| Base | `main` |
| Tag de rollback | `backup/pre-refactor-v2` (HEAD pristine de `main` avant tout refactor) |
| Tag fin Phase 1 | `phase-1-done` sur `e853cac` |
| Tag fin Phase 2 | `phase-2-done` sur `94b83d3` |
| HEAD de la branche refactor | Phase 3 en cours — confirmer avec `git log --oneline -10` |
| Remote push | **non pushé** — tout est local |
| Tests | 12 fichiers / 142 tests / 0 échec |
| Build Next.js | ✅ OK (6 routes statiques, middleware 79.6 kB — inchangé depuis Phase 1) |
| Smoke test Phase 1 | ✅ validé 2026-04-19 (modifs dans l'app, pas de crash, sauvegarde Supabase OK) |
| Smoke test Phase 2 Lot H | ✅ validé 2026-04-20 (SubjectContext migré sur api.ts, persistance OK) |
| Smoke test Phase 2 Lot K | ✅ validé 2026-04-20 (Strategy migrée, recharge + modification OK) |

### Commits sur la branche refactor (du plus récent au plus ancien)

```
143b04e refactor(phase-3): step 3.4 — Session api layer on userDataRepository
ce66928 refactor(phase-3): step 3.3 — extract Session model + TDD tests
f0482f8 refactor(phase-3): step 3.2 — extract Session types to entities/session/types
633ac86 refactor(phase-3): step 3.1 — install zustand dependency
80ab1e3 docs(refactor): validate Phase 2 + plan Phase 3 lots
94b83d3 refactor(phase-2): step 2.10 — migrate Strategy consumers + delete types/strategy.ts
54a775c refactor(phase-2): step 2.9 — Strategy hooks facade + wire isValidStrategy
2ca82e1 refactor(phase-2): step 2.8 — add Strategy model + materialize isValidStrategy guard
e56cdcd refactor(phase-2): step 2.7 — extract Strategy types to entities/strategy/types
7d31f70 refactor(phase-2): step 2.6 — migrate Subject consumers to entities facade
233e117 refactor(phase-2): step 2.5 — add entities/subject/hooks.ts facade
4da9ea9 refactor(phase-2): step 2.4 — migrate SubjectContext to entities/subject/api
0ead8e5 refactor(phase-2): step 2.3 — add entities/subject/api (dormant façade on userDataRepository)
1859117 refactor(phase-2): step 2.2 — extract createDefaultProgress + add computeProgress to entities/subject/model
d824f19 refactor(phase-2): step 2.1 — extract Subject types to entities/subject/types
dba04ed docs(refactor): validate Phase 1 + plan Phase 2 lots
e853cac refactor(phase-1): step 1.14 — verify deletion blocker, keep useCloudStorage.ts
d869f55 docs(refactor): update handoff after Lots C + D (steps 1.9 → 1.13 done)
00bf415 refactor(phase-1): step 1.13 — migrate useSessionTimingStorage to userDataRepository
44c8b75 refactor(phase-1): step 1.12 — migrate EdnCountdown + TasksNotes to useCloudValue
47992cb refactor(phase-1): step 1.11 — migrate EventContext to useCloudValue
ca7df2f refactor(phase-1): step 1.10 — migrate StrategyContext to useCloudValue
b021bc7 refactor(phase-1): step 1.9 — migrate PlanningContext to useCloudValue
7a3d2dd docs(refactor): update handoff after Lot B (steps 1.3 → 1.8 done)
2c91300 refactor(phase-1): step 1.8 — add shared/hooks/useCloudValue on userDataRepository
416f117 refactor(phase-1): step 1.7 — extract toLocalISOString to shared/lib/dates + tests
516a608 refactor(phase-1): step 1.6 — move lib/sessionTiming to entities/session-timing/model
caee08d refactor(phase-1): step 1.5 — move lib/theme to shared/lib/theme
c43963d refactor(phase-1): step 1.4 — move lib/validators to shared/lib/validators
9275191 refactor(phase-1): step 1.3 — move lib/utils to shared/lib/cn
9e92c87 refactor(phase-1): step 1.2 — add userDataRepository facade + tests
e9326d4 refactor(phase-1): step 1.1 — add shared/config/storageKeys.ts
a1adf4f docs(refactor): add REFACTOR_PLAN.md and REFACTOR_HANDOFF.md
3355c67 chore(phase-0): ignore .claude/ and /backups/
14f7277 chore(phase-0): add npm test + test:watch scripts
1dbb595 feat: ajout du WeeklyTracker, session timing storage et documentation technique   ← base main, pointée par backup/pre-refactor-v2
```

---

## 2. Ce qui est validé (ne pas refaire)

### Phase 0 — Préparation (terminée)

| Étape | Statut | Preuve |
|---|---|---|
| 0.1 Baseline tests existants | ✅ | `npm test` → 4 fichiers / 32 tests / 0 échec / ~7s |
| 0.2 Branche + tag | ✅ | `git branch --show-current` = `refactor/architecture-v2`, `git tag` contient `backup/pre-refactor-v2` |
| 0.3 Backup Supabase `user_data` | ✅ | Option A Dashboard CSV — dump local côté user dans `backups/` (jamais commité) |

### Pré-Phase-1 (terminé, prérequis avant Lot A)

| Check | Statut | Commit |
|---|---|---|
| Script `npm test` ajouté à `package.json` | ✅ | `14f7277` |
| `.gitignore` : `.claude/` ignoré | ✅ | `3355c67` |
| `.gitignore` : `/backups/` ignoré (bonus sécurité données perso) | ✅ | `3355c67` (même commit) |
| `npm run build` | ✅ | 6 pages statiques, 0 erreur TS |

### Phase 1 — Infrastructure partagée

| Étape | Statut | Preuve |
|---|---|---|
| 1.1 `shared/config/storageKeys.ts` | ✅ | `src/shared/config/storageKeys.ts` créé avec les 14 clés de `KNOWN_KEYS`, commit `e9326d4`, `npm run build` OK |
| 1.2 `shared/api/userDataRepository.ts` + tests | ✅ | `src/shared/api/userDataRepository.ts` + `src/shared/api/__tests__/userDataRepository.test.ts` créés, `npm test -- userDataRepository` OK, `npm test` OK, `npm run build` OK |
| 1.3 `lib/utils.ts` → `shared/lib/cn.ts` | ✅ | Move + 16 fichiers mis à jour (`@/lib/utils` → `@/shared/lib/cn`). Relatif `./utils` de `sessionTiming.ts` corrigé aussi. Commit `9275191`, build + tests OK. |
| 1.4 `lib/validators.ts` → `shared/lib/validators.ts` | ✅ | Move + 4 fichiers mis à jour. Commit `c43963d`, build + tests OK. |
| 1.5 `lib/theme.ts` → `shared/lib/theme.ts` | ✅ | Move + 3 fichiers mis à jour. Commit `caee08d`, build + tests OK. |
| 1.6 `lib/sessionTiming.ts` → `entities/session-timing/model.ts` | ✅ | Move du module et de ses tests + 3 fichiers consommateurs mis à jour. `src/lib/` vidé et supprimé. Commit `516a608`, build + tests OK. |
| 1.7 extract `toLocalISOString` → `shared/lib/dates.ts` + tests | ✅ | Nouvelle fonction isolée dans `shared/lib/dates.ts`, retirée de `cn.ts`, 4 consommateurs repointés (dont `SessionWidget` qui importait mixte). 3 tests ajoutés. Commit `416f117`, 39 tests OK. |
| 1.8 `shared/hooks/useCloudValue.ts` (non branché) | ✅ | Successeur de `useCloudStorage` construit sur `userDataRepository`. Même API publique (`data/save/saveWith/clear/isReady`). Aucun consommateur branché. Commit `2c91300`, build + tests OK. |
| 1.9 `PlanningContext` → `useCloudValue` | ✅ | 3 call sites migrés (slots, events, deadlines). Commit `b021bc7`, build + tests OK. Smoke test dev server : boot en 4.6s sans erreur runtime. |
| 1.10 `StrategyContext` → `useCloudValue` | ✅ | 1 call site migré (`med-pilot-active-strategy`). Commit `ca7df2f`, build + tests OK. |
| 1.11 `EventContext` → `useCloudValue` | ✅ | 1 call site migré (`med-pilot-events`). Commit `47992cb`, build + tests OK. |
| 1.12 `EdnCountdown` + `TasksNotes` → `useCloudValue` | ✅ | 4 call sites dans `HomeView.tsx` (EDN_DATE, TASKS, NOTES_V2, NOTES v1 read-only). Mock `@/hooks/useCloudStorage` → `@/shared/hooks/useCloudValue` dans `TasksNotes.test.tsx`. Commit `44c8b75`, build + tests OK. |
| 1.13 `useSessionTimingStorage` → `userDataRepository` | ✅ | Hook réécrit : suppression de `createClient`/`useRef(createClient)`, 3 appels Supabase (select/upsert/delete) remplacés par `userDataRepository.get/set/remove`. Test refondu avec `vi.hoisted` pour mocker le repository. API publique du hook inchangée. Commit `00bf415`, build + tests OK. |
| 1.14 suppression conditionnelle `useCloudStorage.ts` | ⚠️ reportée (conforme plan) | **Suppression non effectuée** : 2 consommateurs restants (`ErrorPanel.tsx`, `AnkiExport.tsx`, clé `med-pilot-error-bank`) — leur migration est planifiée en Phase 7 (étapes 7.9 et 7.10). Prompt du plan 1.14 prévoit ce cas. Build + tests OK, fichier `src/hooks/useCloudStorage.ts` conservé tel quel. Commit `e853cac`. |

**Clôture Phase 1** : smoke test utilisateur validé le 2026-04-19 (modifs dans l'app OK, pas de crash, sauvegarde Supabase OK). Tag `phase-1-done` posé sur `e853cac`. 14 étapes / 13 commits code + 2 commits docs. **Phase 1 considérée terminée** malgré 1.14 conditionnellement reportée (scope Phase 7).

### Phase 2 — Entities layer `subject` + `strategy`

| Étape | Statut | Preuve |
|---|---|---|
| 2.1 types Subject | ✅ | `src/entities/subject/types.ts` + re-export depuis `SubjectContext`. Commit `d824f19`. |
| 2.2 model Subject + tests | ✅ | `createDefaultProgress` déplacé, `computeProgress` ajoutée, 6 tests. Commit `1859117`. |
| 2.3 api Subject (dormant) | ✅ | `loadSubjects/saveSubjects` via `userDataRepository`, 5 tests `vi.hoisted`. Commit `0ead8e5`. |
| 2.4 SubjectContext → api | ✅ | `createClient` retiré, `loadFromCloud`/`persist` délèguent à `api.ts`. Commit `4da9ea9`. Smoke user OK. |
| 2.5 facade Subject hooks | ✅ | `src/entities/subject/hooks.ts`, 28 lig. Commit `233e117`. |
| 2.6 migrate 12 consumers Subject | ✅ | 14 lignes sedées (HomeView + SessionEngineContext : 2 chacun). Commit `7d31f70`. |
| 2.7 types Strategy | ✅ | `src/entities/strategy/types.ts` (types + DUREES), `src/types/strategy.ts` devient BC shim. Commit `e56cdcd`. |
| 2.8 model Strategy + tests | ✅ | `createEmptyStrategy` déplacé + nouveau prédicat `isValidStrategy` (10 cas couverts). 12 tests. Commit `2ca82e1`. |
| 2.9 wire isValidStrategy | ✅ | Guard inline L27-33 de `StrategyContext` remplacée par `isValidStrategy(rawStrategy)`. Sémantique strictement identique. Commit `54a775c`. |
| 2.10 migrate Strategy + delete types/strategy | ✅ | 5 Context consumers + 8 types consumers + 1 fix relatif (`./strategy` dans `types/session.ts`). `src/types/strategy.ts` supprimé. Commit `94b83d3`. Smoke user OK. |

**Clôture Phase 2** : smoke tests utilisateur validés le 2026-04-20 (après Lot H et après Lot K). Tag `phase-2-done` posé sur `94b83d3`. 10 steps atomiques / 10 commits code + 1 commit docs. 62 tests verts.

### Phases 4 à 8

**Non commencées.** Voir `REFACTOR_PLAN.md` pour le détail.

### Phase 3 — Session Engine refactor

| Étape | Statut | Preuve |
|---|---|---|
| 3.1 install `zustand` | ✅ | `package.json` + `package-lock.json` mis à jour, commit `633ac86`, build + tests OK |
| 3.2 `entities/session/types.ts` + BC shim | ✅ | `src/entities/session/types.ts` créé, `src/types/session.ts` devient re-export, commit `f0482f8`, build + tests OK |
| 3.3 `entities/session/model.ts` + TDD tests | ✅ | `src/entities/session/model.ts` + `src/entities/session/__tests__/model.test.ts` créés, commit `ce66928`, build + tests OK |
| 3.4 `entities/session/api.ts` + tests | ✅ | `src/entities/session/api.ts` + `src/entities/session/__tests__/api.test.ts` créés, `med-pilot-daily-session` ajouté à `STORAGE_KEYS.session.daily`, commit `143b04e`, build + tests OK |
| 3.5 `entities/session/store.ts` + tests | ✅ | Store Zustand dormant ajouté avec `hydrate/generate/start/complete/skip/clear/setSession` + tests. Deux bugs critiques corrigés avant commit : réhydratation laissant un état mémoire obsolète, et course asynchrone pouvant perdre des entrées d'historique. Commit `147bff8`. Build + 142 tests OK. |
| 3.6 `entities/session/hooks.ts` selectors | ✅ | `useDailySession`, `useCurrentTask`, `useAllDone`, `useTotalElapsed`, `useHasSessionToday`, `useSessionActions`, `useSessionHydrated`, `useSessionHistory` ajoutés. Fichier dormant tant que `SessionEngineContext` n'importe rien depuis `entities/session`. Build + 142 tests OK. |
| 3.7 façade `SessionEngineContext` sur Zustand | ⚠️ code OK, smoke requis | `src/context/SessionEngineContext.tsx` réécrit en façade temporaire lisant le store Zustand, API publique inchangée pour les consommateurs. `npm test` + `npm run build` OK. **Smoke test utilisateur obligatoire avant de considérer l'étape validée.** |

**État** : les lots L, M, N, O et P sont validés. Le lot Q est **codé et compilé**, mais pas encore validé produit : `SessionEngineContext` lit désormais le store Zustand et la persistance réelle a basculé. **Stop obligatoire ici** jusqu'au smoke test utilisateur du lot Q.

---

## 3. Décisions figées (ne pas rouvrir)

Voir `REFACTOR_PLAN.md` §4 pour le détail. En bref :

- Architecture : **FSD allégée 4 couches** (`app → features → entities → shared`)
- State management : **Zustand pour `SessionEngine` seulement**, Context pour le reste
- Routing : **vraies routes Next.js via route group `(app)`** (plus de `useView()`)
- Server vs Client : **essentiellement client**, seul `app/layout.tsx` reste serveur
- Accès Supabase : **`userDataRepository` générique + `api.ts` par entité**
- Tests : **colocation `__tests__/`**
- Clés de stockage : **inchangées** — `storageKeys.ts` est une déduplication, pas un renommage

---

## 4. Prochaine action à exécuter — **Smoke test utilisateur du Lot Q**

Phase 2 **validée** (10 étapes, 2 smoke tests user OK). La **Phase 3** a franchi ses fondations pures et le flip-switch `Q` a été codé : `SessionEngineContext.tsx` est maintenant une façade sur Zustand, sans changement d'API côté consommateurs.

**Point de contrôle** : à partir de `Q`, la persistance réelle et le comportement utilisateur peuvent changer malgré une API stable. Aucun lot suivant ne doit démarrer avant validation manuelle.

### Smoke test Q — Façade `SessionEngineContext` sur Zustand (step 3.7 déjà codé)

Risque : **moyen**. Premier flip-switch réel de la Phase 3.

| Step | Action | Fichiers |
|---|---|---|
| 3.7 | `src/context/SessionEngineContext.tsx` a été réécrit en façade lisant le store Zustand et exposant l'API historique (`session`, `generateSession`, `startCurrentTask`, `completeCurrentTask`, `skipCurrentTask`, `currentTask`, `currentTaskIndex`, `allDone`, `totalElapsedMs`, `hasSessionToday`). Aucun consommateur n'a changé, mais la persistance réelle a basculé vers le store. | `src/context/SessionEngineContext.tsx` |

**Vérification Q déjà faite côté code** : `npm test` vert, `npm run build` vert.

**Smoke test utilisateur obligatoire maintenant** :
- login avec un compte de test
- ouvrir le cockpit avec une stratégie déjà configurée
- générer une session du jour si nécessaire
- démarrer la tâche courante puis vérifier que le timer tourne
- compléter une tâche avec un rating puis vérifier que la progression sujet est mise à jour
- rafraîchir la page et vérifier que la session du jour est restaurée
- vérifier que l'avancement visible et le temps total restent cohérents après refresh

### Prochaine phase logique

Après smoke Q :
- si OK → prochain lot = `R`
- si KO → rollback immédiat du commit Q uniquement

---

## 5. Plan des lots pour le reste de Phase 1

Imposé par le user pour limiter le blast radius. Chaque lot se termine par un stop + rapport au user avant de passer au suivant.

| Lot | Étapes | Ce qu'il contient | Action de validation après |
|---|---|---|---|
| **A** | 1.1 → 1.2 | Création `storageKeys.ts` + `userDataRepository.ts` avec ses tests. Aucun consommateur branché. | Stop + rapport |
| **B** | 1.3 → 1.8 | Moves `lib/*` → `shared/lib/*` + `lib/sessionTiming.ts` → `entities/session-timing/model.ts` + `shared/hooks/useCloudValue.ts` (non branché). Find-and-replace d'imports, tests existants continuent de passer. | Stop + rapport |
| **C** | 1.9 → 1.10 + smoke test | Migrer `PlanningContext` puis `StrategyContext` vers `useCloudValue`. Smoke test dev : créer événement planning, modifier stratégie, rafraîchir. | Stop + smoke test obligatoire |
| **D** | 1.11 → 1.13 + smoke test | Migrer `EventContext`, `EdnCountdown`, `TasksNotes` vers `useCloudValue`. Migrer `useSessionTimingStorage` vers `userDataRepository`. Smoke test : créer agenda event, changer date EDN, écrire note, démarrer session pour toucher le timing. | Stop + smoke test obligatoire |
| **E** | 1.14 | Supprimer `src/hooks/useCloudStorage.ts` (plus aucun consommateur). Build final. | Stop + fin Phase 1 |

**À la fin de Phase 1** : tag `phase-1-done`, smoke test complet selon `REFACTOR_PLAN.md` §9. ✅ fait le 2026-04-19.

---

## 5b. Plan des lots pour la Phase 2

10 steps atomiques (2.1 → 2.10) regroupés en **6 lots courts**. Règle : `npm test` vert + HEAD commité avant de démarrer le lot suivant. Lots H et K demandent un smoke test utilisateur.

| Lot | Étapes | Ce qu'il contient | Risque | Action de validation après |
|---|---|---|---|---|
| **F** | 2.1 → 2.2 | Subject foundation : `entities/subject/types.ts` (copie depuis `SubjectContext`) + `entities/subject/model.ts` (extrait `createDefaultProgress`, nouveau `computeProgress`) + tests. Aucun consommateur touché. | faible | Stop + rapport |
| **G** | 2.3 | Subject API layer : `entities/subject/api.ts` (`loadSubjects`, `saveSubjects` via `userDataRepository`) + tests. Fichier **dormant** — pas câblé au Context. | faible | Stop + rapport |
| **H** | 2.4 | Migration interne `SubjectContext.tsx` : remplacer `createClient()` + `loadFromCloud` + `persist` hand-rolled par `loadSubjects()` / `saveSubjects()` de `api.ts`. **Même clé `med-pilot-subjects-v4`, même format, même API publique.** | **MOYEN** ⚠ | Stop + **smoke test obligatoire** (login → créer subject + chapitres → toggle status → refresh → persistance OK + autre onglet OK) |
| **I** | 2.5 → 2.6 | `entities/subject/hooks.ts` (façade ré-export) + `sed`-replace dans les **12 consommateurs** : `from '@/context/SubjectContext'` → `from '@/entities/subject/hooks'`. `SubjectContext.tsx` lui-même non touché. | faible | Stop + rapport |
| **J** | 2.7 → 2.9 | Strategy foundation : `entities/strategy/types.ts` (copie de `src/types/strategy.ts`) + `entities/strategy/model.ts` (`createEmptyStrategy`, nouveau prédicat `isValidStrategy`) + tests + `entities/strategy/hooks.ts` façade. `StrategyContext.tsx` utilise `isValidStrategy` pour la guard L27-33. Bundlé car pas de migration risquée (déjà sur `useCloudValue`). | faible | Stop + rapport |
| **K** | 2.10 | Strategy imports : `sed`-replace dans les **5 consommateurs** (`@/context/StrategyContext` → `@/entities/strategy/hooks`) + **7 consommateurs** (`@/types/strategy` → `@/entities/strategy/types`) + suppression de `src/types/strategy.ts`. | faible | Stop + **smoke test léger** (login → recharger stratégie → modifier → refresh → OK) + tag `phase-2-done` |

**Lot recommandé à exécuter en priorité : Lot F** (risque zéro, pose les fondations, valide le pattern `entities/*/types.ts` + `model.ts` avant Planning et Session).

**Ordre strict après Lot F** : F → G → H (smoke) → I → J → K (smoke + tag). Ne **PAS** bundler H avec I (mélange risque moyen + find-and-replace = diagnostic difficile en cas de rollback).

### Critères de succès Phase 2 (bilan réel)

- [x] `entities/subject/` et `entities/strategy/` existent avec `types.ts`, `model.ts`, `api.ts` (subject only), `hooks.ts` + `__tests__/`
- [x] `SubjectContext.tsx` ne contient plus aucun `supabase.from(...)` direct — tout passe par `api.ts`
- [x] `StrategyContext.tsx` utilise `isValidStrategy` de `entities/strategy/model.ts`
- [x] `src/types/strategy.ts` supprimé
- [x] **25 imports migrés** (12 Subject + 5 Context Strategy + 8 types Strategy + 1 relatif bonus `./strategy` dans `src/types/session.ts`)
- [x] Tests 39 → **62** (+12 Subject, +12 Strategy ; objectif ~50 dépassé)
- [x] Tag `phase-2-done` posé
- [x] Smoke tests user passés (Lot H + Lot K)

---

## 5c. Plan des lots pour la Phase 3

8 steps atomiques (3.1 → 3.8) regroupés en **7 lots**. Phase 3 est le plus gros chantier du refactor (`SessionEngineContext.tsx` : 496 lig → 6 fichiers). Introduit la dépendance `zustand`.

**Stratégie** : les 4 premiers lots (L → P) sont des **pures additions** (aucun consommateur touché, store dormant tant que rien ne l'importe). Peuvent être enchaînés sans smoke intermédiaire. Les 2 derniers (Q, R) flippent les consommateurs vers Zustand → smoke obligatoire à chaque fois.

| Lot | Étapes | Ce qu'il contient | Risque | Smoke |
|---|---|---|---|---|
| **L** | 3.1 → 3.2 | `npm install zustand` + `entities/session/types.ts` (move de `src/types/session.ts`, BC shim). Aucun code touché. | faible | non |
| **M** | 3.3 | `entities/session/model.ts` : copier-coller les fonctions pures de `SessionEngineContext.tsx` (`generateDailyTasks`, `categoriseChapter`, `chapterPriority`, `buildChapterTasks`, `getTargetSubjects`, `getAnnaleLevel`, `applyTaskCompletion`, `computeTotalElapsedMs`, `findCurrentTaskIndex`). **Écrire les tests AVANT réarrangement** (TDD strict pour figer le comportement actuel). Matrix : `categoriseChapter` × 4, `chapterPriority` × tri, `generateDailyTasks` × ~9 scénarios, `applyTaskCompletion` × 2 chemins. ~180 lig code + ~200 lig tests. | faible (pure addition) | non |
| **N** | 3.4 | `entities/session/api.ts` : `loadDailySession`, `saveDailySession`, `clearDailySession`, `loadSessionHistory`, `appendSessionHistory` via `userDataRepository`. Fichier **dormant** — pas câblé. Tests avec repo mocké. | faible | non |
| **O** | 3.5 | `entities/session/store.ts` : Zustand + `persist` middleware custom branché sur `userDataRepository` (pas `localStorage` nu). State `{ session, isHydrated }` + actions. **Store dormant tant qu'aucun consommateur ne l'importe.** | faible (dormant) | non |
| **P** | 3.6 | `entities/session/hooks.ts` : selectors granulaires (`useDailySession`, `useCurrentTask`, `useAllDone`, `useTotalElapsed`, `useHasSessionToday`, `useSessionActions(shallow)`). Dormants. | faible | non |
| **Q** | 3.7 | **Transition douce** : `SessionEngineContext.tsx` devient une **façade** qui lit le store Zustand et expose l'ancienne API publique. Tous les consommateurs (`SessionWidget`, `HomeView`, `WeeklyTracker`, `SubjectDetailModal` qui lit `updateChapterProgress`…) continuent sans modification. **Flip du switch persistance**. | **moyen** ⚠ | **obligatoire** : login → démarrer une session → compléter une tâche → refresh → timer & progression préservés |
| **R** | 3.8 | Migration des consommateurs vers les selectors directs + suppression de la façade `SessionEngineContext.tsx`. Migration des imports `@/context/SessionEngineContext` vers `@/entities/session/hooks`. Suppression éventuelle de `src/types/session.ts` (BC shim de Lot L). | **moyen** | **obligatoire** (même scénario que Lot Q) |

**Ordre strict** : L → M → N → O → P → Q (smoke) → R (smoke + tag `phase-3-done`).

**Chainable autonomement (risque faible, pas de smoke)** : L + M + N + O + P. Stop obligatoire avant Q.

### Critères de succès Phase 3

- [x] `entities/session/{types,model,api,store,hooks}.ts` + `__tests__/` existent
- [x] `zustand` présent dans `package.json`
- [ ] `SessionEngineContext.tsx` supprimé (ou réduit à ~0 lignes via façade temporaire puis supprimé)
- [x] `generateDailyTasks` et compagnie testées en isolation (~200 lig de tests unitaires)
- [x] Clé de stockage `med-pilot-daily-session` **préservée** dans `STORAGE_KEYS`
- [x] Format sérialisé des sessions **inchangé** côté `api.ts` (round-trip des accès repository couvert)
- [x] Tests passent de 62 → 142
- [ ] Tag `phase-3-done` posé
- [ ] Smoke tests user passés (après Lot Q et après Lot R)

### Points d'attention spécifiques Phase 3

1. **Règle dure** : `generateDailyTasks(strategy, subjects, load)` reçoit les données en **paramètres**, jamais via un autre store (cf. invariant §7.5). Le hook d'orchestration `features/session-widget/useSessionWidget.ts` (créé plus tard en Phase 7) composera les 3 stores ; d'ici là c'est `SessionEngineContext` façade qui consomme `useSubjects()` + `useStrategy()`.
2. **Persist middleware Zustand + userDataRepository** : hydratation asynchrone. Prévoir `isHydrated: false` au boot + skeleton côté consommateurs le temps du premier load cloud (déjà le pattern actuel via `localStorage` init + `useEffect` de chargement Supabase).
3. **`med-pilot-daily-session` absent de `KNOWN_KEYS`** : l'écart existe toujours après le Lot O. Il ne bloque pas le store dormant, mais doit être traité avant la clôture de la Phase 3 pour que `useMigration.ts` ne l'ignore plus silencieusement.
4. **Tests Lot M = artefact critique** : ils figent le comportement actuel AVANT tout réarrangement. Si un test capture mal un edge case, le refactor Zustand introduira un bug silencieux. Review attentive recommandée avant Lot O.

---

## 6. Règles d'engagement (strictes)

1. **1 commit par étape atomique.** Jamais de fusion de plusieurs étapes dans un commit.
2. **Message de commit** : `refactor(phase-N): step N.M — short description`.
3. **Si une étape échoue** → revert de **cette étape seulement** (pas du lot complet), redécoupe si besoin, relance.
4. **Stop à la fin de chaque lot** — rapport précis au user avant de passer au lot suivant.
5. **Pas de scope creep** — ne modifie pas le périmètre d'une étape sans le signaler explicitement au user.
6. **Pas de mix** architecture + migration de données + refactor UI lourd dans la même étape.
7. **Smoke test manuel obligatoire** après chaque lot qui touche un consommateur (Lot C, D, E).
8. **Clés de stockage Supabase sacrées** — jamais renommées, jamais de changement de format sérialisé pendant le refactor.

---

## 7. Invariants à ne JAMAIS casser

1. **Clés de stockage Supabase inchangées** — `med-pilot-*`, `albugi-*`, `dp_*` restent littéralement identiques. `storageKeys.ts` est une déduplication, jamais un renommage.
2. **Format sérialisé inchangé** — nouveaux champs = optionnels + validator tolérant. Aucune migration de schéma pendant le refactor.
3. **`src/lib/validators.ts`** (futur `shared/lib/validators.ts`) continue d'être appelé au chargement des données.
4. **Singleton Supabase client** — `createClient()` reste un singleton unique. Plusieurs instances = erreur Supabase *"Lock broken by another request with the 'steal' option"*.
5. **Aucun store Zustand ne lit un autre store directement** — les actions reçoivent les données en paramètres.
6. **`backups/` jamais commité** — données perso, ignoré via `.gitignore` (déjà en place).
7. **`.claude/` jamais commité** — settings et plans de session locaux, ignoré via `.gitignore` (déjà en place).

### À surveiller (Phase 3+) — divergences de clés pré-existantes

Identifiées pendant la Phase 1 mais **intentionnellement non touchées** (hors scope refactor d'infrastructure). À consolider lors de la **Phase 3** (Session Engine) où elles tombent dans le périmètre :

- `med-pilot-daily-session` — utilisée par `SessionEngineContext`, **absente** de `KNOWN_KEYS` dans `useMigration.ts`. Migration silencieuse potentiellement invisible.
- `med-pilot-quick-notes-v2` vs `med-pilot-quick-notes` — `KNOWN_KEYS` contient v1, `HomeView.tsx` lit v2 avec un fallback read-only sur v1 (pattern dual-key intentionnel).
- `medpilot-theme` — préfixe différent (pas de tiret après "med"), préférence locale volontaire (pas dans Supabase).
- `med-pilot-gemini-key` / `med-pilot-gemini-model` — credentials machine-local (volontairement pas sync cloud).
- `med-pilot-migration-done` — flag interne de `useMigration.ts`.

---

## 8. Rollback

### Rollback d'une étape

```bash
git revert HEAD       # annule le dernier commit (= dernière étape)
```

### Rollback d'un lot complet

```bash
git revert --no-commit <premier-commit-du-lot>^..HEAD
git commit -m "revert: rollback lot X"
```

### Rollback total (retour à l'état pristine de main)

```bash
git checkout main
git reset --hard backup/pre-refactor-v2
git branch -D refactor/architecture-v2   # optionnel, si on repart de zéro
```

En cas de corruption de données Supabase (ne devrait pas arriver car les clés ne changent pas) : importer le dump CSV de `backups/user_data_*.csv` via le Dashboard Supabase → Table Editor → Insert rows.

---

## 9. Prompt de reprise pour un autre agent

À copier-coller dans une session fraîche avec n'importe quel agent coding (Claude Code, Antigravity, Codex, etc.) pour continuer le refactor sans ambiguïté.

```
Tu reprends le refactor architectural d'AlbugiMed (Next.js 14 / TypeScript /
Supabase). Le projet est à D:\AlbugiMed sous Windows (bash via Git Bash).

AVANT TOUT, lis dans cet ordre :
1. docs/REFACTOR_PLAN.md          — plan figé : contexte, archi cible, 86 étapes
                                    atomiques pour les 8 phases, invariants
2. docs/REFACTOR_HANDOFF.md       — état RÉEL courant : ce qui est fait,
                                    prochain lot exact, règles d'engagement
3. git log --oneline -10          — confirme le HEAD
4. git status                     — vérifie working tree propre
5. npm test                       — confirme la baseline (ne doit pas avoir
                                    régressé)

Ensuite :
- Identifie le "prochain lot" dans docs/REFACTOR_HANDOFF.md §4
- Exécute les étapes du lot EN RESPECTANT ABSOLUMENT ces règles :
  • 1 commit par étape atomique, format `refactor(phase-N): step N.M — desc`
  • jamais fusionner plusieurs étapes dans un même commit
  • stop à la fin du lot, rapport précis au user
  • smoke test manuel si le lot touche un consommateur
  • si une étape échoue → revert de cette étape uniquement, pas du lot
  • scope d'étape ne doit pas bouger sans signalement explicite au user
  • clés de stockage Supabase JAMAIS renommées
  • après chaque étape, mets à jour docs/REFACTOR_HANDOFF.md §2 (validé)

Branche : refactor/architecture-v2
Tag de rollback : backup/pre-refactor-v2
```

---

## 10. Historique des mises à jour du handoff

| Date | Auteur | Changement |
|---|---|---|
| 2026-04-15 | Claude (session initiale) | Création du document. Phase 0 terminée + pré-Phase-1. Prêt pour Lot A. |
| 2026-04-15 | Codex | Lot A terminé : étapes 1.1 et 1.2 validées. Prochain lot : B (1.3 → 1.8). |
| 2026-04-17 | Claude (session interactive) | Lot B terminé : étapes 1.3 à 1.8 validées (6 commits atomiques). Build + 39 tests OK. `src/lib/` supprimé. `shared/hooks/useCloudValue.ts` créé mais pas encore branché aux consommateurs. Prochain lot : C (1.9 → 1.10 + smoke test). |
| 2026-04-18 | Claude (session interactive) | Lots C et D enchaînés sur autorisation conditionnée aux tests. 5 commits atomiques (1.9 → 1.13). Build + 39 tests OK à chaque étape. `PlanningContext`, `StrategyContext`, `EventContext`, `EdnCountdown`, `TasksNotes` migrés sur `useCloudValue`. `useSessionTimingStorage` refondé sur `userDataRepository` (tests ré-écrits avec `vi.hoisted`). `useCloudStorage` encore utilisé par `ErrorPanel` + `AnkiExport` (scope Phase 7). Prochain lot : E (1.14). |
| 2026-04-18 | Claude (session interactive) | Lot E : étape 1.14 exécutée selon le plan. Grep : 2 importeurs subsistent (`ErrorPanel.tsx`, `AnkiExport.tsx`). Conformément au prompt (`si importeurs restants, liste-les, ne supprime pas`), **`src/hooks/useCloudStorage.ts` conservé**. Build final + 39 tests OK. Suppression reportée à après Phase 7 (étapes 7.9 + 7.10 migreront ces 2 derniers consommateurs). Smoke test programmatique OK (HTTP /login 200, middleware OK, 0 erreur logs). Smoke test UI authentifié à faire par le user. |
| 2026-04-19 | Claude (session interactive) | **Phase 1 validée** côté utilisateur (smoke test OK : modifs dans l'app, pas de crash, sauvegarde Supabase OK). Tag `phase-1-done` posé sur `e853cac`. **Phase 2 cadrée** : 10 steps atomiques (2.1 → 2.10) regroupés en 6 lots F→K (voir §5b). Lot recommandé en priorité : Lot F (Subject foundation, risque zéro). Divergences de clés pré-existantes reportées à Phase 3 (voir §7 "À surveiller"). Prochain lot : Lot F. |
| 2026-04-20 | Claude (session interactive, semi-autonome souple) | **Phase 2 terminée en une journée** : 10 steps / 10 commits code + 1 commit docs. Lots F → K exécutés dans l'ordre strict, smoke tests user OK après H et K. Tag `phase-2-done` posé sur `94b83d3`. Tests 39 → 62 (+12 Subject, +12 Strategy, 0 régression). Build 79.6 kB middleware inchangé. 25 imports migrés vers `entities/subject/*` et `entities/strategy/*`. `src/types/strategy.ts` supprimé. Mini-surprise gérée : 1 référence relative `./strategy` dans `src/types/session.ts` que le grep alias-only avait manquée, corrigée au step 2.10. **Phase 3 cadrée** : 7 lots L→R (voir §5c). Chainables autonomement (pures additions) : L+M+N+O+P. Stop obligatoire avant Q (flip switch persistance). Prochain lot : Lot L. |
| 2026-04-20 | Codex | Audit + reprise Phase 3. État réel resynchronisé avec le dépôt : steps 3.1 à 3.4 déjà commités (`633ac86`, `f0482f8`, `ce66928`, `143b04e`). Step 3.5 commit `147bff8` : store Zustand dormant + tests renforcés. Deux bugs critiques corrigés avant commit : réhydratation qui conservait un état mémoire obsolète et course asynchrone pouvant perdre des entrées d'historique. Step 3.6 commit `7c86fa1` : selectors Zustand dormants (`entities/session/hooks.ts`). Step 3.7 codé : `SessionEngineContext.tsx` devient façade sur Zustand, API publique conservée, build + 142 tests OK. **Stop ici en attente du smoke test utilisateur du lot Q** avant tout passage au lot R. |
