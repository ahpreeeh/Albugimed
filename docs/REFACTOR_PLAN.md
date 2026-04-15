# AlbugiMed — Plan de refonte architecturale

> **Document de référence.** Transpose le plan d'origine `cached-prancing-sunrise.md` (stocké hors-repo dans `.claude/plans/`) en version committée, stable et exploitable par n'importe quel agent coding (Claude Code, Antigravity, Codex, etc.). Couplé à `REFACTOR_HANDOFF.md` qui tient l'**état courant** du refactor.

**Branche de travail** : `refactor/architecture-v2`
**Tag de sauvegarde** : `backup/pre-refactor-v2` (HEAD pristine de `main` avant toute modif)
**Filet de sécurité** : `git checkout main && git reset --hard backup/pre-refactor-v2` + dump CSV Supabase `user_data` local

---

## 1. Objectif

Rendre AlbugiMed robuste, maintenable et flexible à l'ajout de features. Accepter une mise en maintenance pour faire une refonte propre puis redéployer une version clean.

## 2. Diagnostic — 3 maladies de l'archi actuelle

L'app (~55 fichiers, ~8000 lignes TS/TSX productives, Next.js 14 App Router) fonctionne mais souffre de :

1. **Logique pure prisonnière de composants React.** `generateDailyTasks`, `parseNLPInput`, `layoutOverlaps`, helpers de calendrier sont coincés dans des `.tsx` → intestables.
2. **Pattern `useCloudStorage` ignoré par 3 gros consommateurs** (`SubjectContext`, `SessionEngineContext`, `useSessionTimingStorage`) → **6 duplications** de `supabase.from('user_data').upsert(...)`.
3. **Pseudo-routing via `useView()`** qui casse App Router sans bénéfice UX : pas d'URL partageable, pas de back/forward, pas de code splitting.

**MVC n'est PAS la solution** — c'est un anti-pattern pour React/Next.js. Cible : **Feature-Sliced Design allégée** (4 couches, pas FSD complet 7 couches).

## 3. Architecture cible — FSD allégée 4 couches

```
src/
├── app/           # Routes Next.js (App Router) — layouts + pages fines
├── features/      # Cas d'usage UI composés (UI + hooks d'orchestration)
├── entities/      # Domaines métier — types + model (pur) + api + store + hooks
└── shared/        # Infrastructure, primitives UI, utils transverses
```

**Règle d'import (strict)** : `app → features → entities → shared`. Jamais en arrière. À terme forcée par `eslint-plugin-boundaries` (Phase 8).

## 4. Décisions figées (ne pas rouvrir)

| Décision | Choix | Raison |
|---|---|---|
| Structure dossiers | FSD allégée 4 couches | `SessionEngine` traverse 3 routes — enfermer par route créerait des imports bizarres. FSD complet est overkill à cette taille. |
| State management | **Zustand pour `SessionEngine` seulement**, Context pour le reste | Seul `SessionEngine` justifie Zustand (timer haute fréquence, multi-consommateurs). Migration wholesale = 2 paradigmes = coût > gain. |
| Routing | Vraies routes Next.js via route group `(app)` | `useView()` actuel ne sert à rien (aucune transition, aucun état cross-view). Passer aux routes débloque URL partageables, back/forward, code splitting, prefetching. |
| Server vs Client Components | **Rester essentiellement client** | App 100 % derrière auth, 100 % interactive, données Supabase par user. RSC n'apportent rien. Seul `app/layout.tsx` reste serveur. |
| Accès Supabase | `userDataRepository` générique + `api.ts` par entité | Élimine 6 duplications. `api.ts` testable avec repo mocké. |
| Tests | Colocation `__tests__/` | Pattern déjà en place (`lib/__tests__/`, `hooks/__tests__/`). Vitest + Testing Library déjà configurés. |
| Clés de stockage Supabase | **Inchangées** (déduplication, pas renommage) | `user_data` contient des données production. Les constantes de `storageKeys.ts` **répètent** les clés existantes. |

## 5. Arbre de dossiers cible

```
src/
├── app/
│   ├── layout.tsx                          # RootLayout serveur : html, polices, <AppProviders>
│   ├── providers.tsx                       # "use client" — assemble Zustand + Contexts + Theme + Auth
│   ├── (app)/                              # Route group — routes protégées
│   │   ├── layout.tsx                      # "use client" — AppShell (TopNav + fond)
│   │   ├── cockpit/page.tsx                # ex-HomeView
│   │   ├── subjects/page.tsx               # ex-SubjectsView
│   │   ├── planning/page.tsx               # ex-PlanningView (80 lig au lieu de 1424)
│   │   └── simulation/page.tsx             # ex-SimulationView
│   ├── login/                              # Hors (app) pour ne pas charger les stores
│   │   ├── page.tsx
│   │   └── actions.ts                      # Server Actions Supabase (inchangé)
│   ├── restore/page.tsx
│   └── globals.css
│
├── features/                               # Cas d'usage UI composés
│   ├── session-widget/                     # ex-SessionWidget (380 lig → 4 fichiers)
│   ├── strategy-picker/                    # ex-StrategyModal
│   ├── planning-grid/                      # mode "week" de PlanningView
│   ├── planning-calendar/                  # mode "calendar"
│   ├── planning-recurrent/                 # mode "recurrent" + RecurrentSlotDialog
│   ├── simulator-chat/                     # ex-SimulatorChat + AnkiExport
│   ├── error-panel/                        # ex-ErrorPanel
│   ├── subject-list/                       # SubjectCard + AddSubjectModal + SubjectDetailModal
│   ├── home-widgets/                       # StatsBar, EdnCountdown, RecentErrors, TasksNotes
│   ├── weekly-tracker/                     # WeeklyTracker (déjà testé, déplacé)
│   └── migration-notice/                   # ex-MigrationRunner
│
├── entities/                               # Domaines métier — sans React pour model.ts/api.ts
│   ├── session/
│   │   ├── types.ts                        # ex-src/types/session.ts
│   │   ├── model.ts                        # generateDailyTasks, categoriseChapter, chapterPriority, buildChapterTasks, getAnnaleLevel, getTargetSubjects, applyTaskCompletion, computeTotalElapsedMs, findCurrentTaskIndex — TOUS PURS
│   │   ├── api.ts                          # loadDailySession, saveDailySession, loadHistory, appendHistory
│   │   ├── store.ts                        # Zustand : state + actions, persist middleware via userDataRepository
│   │   ├── hooks.ts                        # useDailySession, useCurrentTask, useSessionActions (selectors)
│   │   └── __tests__/model.test.ts         # ~200 lig tests purs
│   ├── session-timing/                     # ex-lib/sessionTiming.ts + useSessionTimingStorage
│   ├── subject/                            # ex-SubjectContext (types + model + api + hooks)
│   ├── strategy/                           # ex-StrategyContext
│   ├── planning/
│   │   ├── types.ts                        # RecurrentSlot, PlanningEvent, GridItem, ModalData, ViewMode
│   │   ├── model.ts                        # parseNLPInput, layoutOverlaps, timeToMinutes, buildCalendarMonth, assembleGridItems, expandRecurrentSlotsForRange — TOUS PURS
│   │   ├── api.ts
│   │   ├── hooks.ts                        # usePlanning, useWeekEvents, useRecurrentSlots
│   │   └── __tests__/model.test.ts
│   ├── event/                              # ex-EventContext (AgendaEvent + expandRecurring)
│   ├── simulation/                         # types + gemini wrapper + extractErrorCapture + buildAnkiTsv
│   └── tracking/                           # ex-weeklyTrackerUtils (déjà pur et testé)
│
└── shared/
    ├── api/
    │   ├── supabaseClient.ts               # ex-utils/supabase/client.ts (singleton, INCHANGÉ)
    │   ├── supabaseServer.ts               # ex-utils/supabase/server.ts
    │   └── userDataRepository.ts           # NOUVEAU — façade générique sur user_data
    │                                       #   get<T>(key), set<T>(key, value), remove(key), batchGet(keys)
    ├── lib/
    │   ├── cn.ts                           # ex-lib/utils.ts (clsx + tailwind-merge)
    │   ├── dates.ts                        # toLocalISOString, formatters étendus
    │   ├── validators.ts                   # ex-lib/validators.ts (INCHANGÉ, critique pour backward-compat)
    │   └── theme.ts
    ├── hooks/
    │   ├── useCloudValue.ts                # Généralisation de useCloudStorage, branchée sur userDataRepository
    │   └── useAuth.ts                      # Session Supabase (userId, user, isLoaded)
    ├── ui/                                 # Primitives réutilisées
    │   ├── Modal.tsx                       # Mutualisé (EventModal, StrategyModal, MigrationNotice)
    │   └── Button.tsx, Badge.tsx, SegmentedControl.tsx, ...
    ├── config/
    │   ├── storageKeys.ts                  # Toutes les clés centralisées (depuis KNOWN_KEYS de useMigration.ts:19-43)
    │   └── constants.ts
    ├── icons/                              # ex-components/icons/MedicalIcons.tsx (inchangé)
    └── types/                              # Types transverses
```

## 6. Vue d'ensemble des phases

| Phase | Étapes | Objectif | Risque global |
|---|---|---|---|
| 0 | 3 | Préparation : baseline tests, branche + tag, backup Supabase | nul |
| 1 | 14 | Infrastructure partagée (`shared/`) — le gros refactor commence | faible-moyen |
| 2 | 10 | Entities `subject` et `strategy` — prouver le pattern sur les cas simples | faible |
| 3 | 10 | **Session Engine refactor — pivot critique (étape 3.8)** | **élevé** |
| 4 | 11 | Routes Next.js — remplacer le pseudo-routing | moyen (auth en 4.11) |
| 5 | 15 | Refactor `PlanningView.tsx` (1424 → 80 lig + 12 fichiers) | moyen |
| 6 | 7 | `HomeView` + `SubjectsView` + `SimulationView` | faible |
| 7 | 10 | Gros composants features (`SessionWidget`, `StrategyModal`, `SimulatorChat`) | moyen-élevé |
| 8 | 6 | Finition + lint boundaries + `ARCHITECTURE.md` | faible |

**Total : 86 étapes atomiques.**

## 7. Convention d'exécution

Chaque étape est décrite avec 7 champs :

- **Obj** : objectif unique, testable, en une phrase
- **Dépend** : étapes préalables obligatoires
- **Touche** : fichiers créés / modifiés / supprimés
- **Prompt** : texte copiable tel quel pour un agent coding
- **Valide** : critère de réussite
- **Risque** : nul / faible / moyen / élevé
- **Reversible** : oui / non

**Règles dures** :

1. **1 commit par étape atomique**, jamais de fusion de plusieurs étapes dans un commit.
2. Message de commit au format : `refactor(phase-N): step N.M — short description`.
3. Si une étape échoue → **revert de cette étape seulement**, redécoupe, puis relance.
4. Ne **jamais** modifier le périmètre d'une étape sans le signaler explicitement.
5. Pas de scope creep : une étape ne fait pas "en même temps" architecture + migration de données + refactor UI lourd.
6. Les **clés de stockage Supabase ne changent JAMAIS** pendant le refactor (`med-pilot-subjects-v4`, `albugi-planning-slots`, etc.).
7. Après chaque étape à risque moyen ou élevé → smoke test manuel (voir §9).
8. À la fin de chaque phase → commit tag `phase-N-done` + smoke test complet.

---

## 8. Étapes atomiques — Phase 0 → Phase 8

### Phase 0 — Préparation (~1 h)

#### Étape 0.1 — Vérifier que les tests existants passent

- **Obj** : confirmer la baseline fonctionne avant toute modif.
- **Dépend** : —
- **Touche** : aucun fichier modifié.
- **Prompt** : `Lance npm test dans D:\AlbugiMed et rapporte : nombre de tests passed/failed/skipped, fichiers qui échouent (s'il y en a), temps total. Ne rien modifier.`
- **Valide** : 0 test en échec. Si échec → corriger AVANT de continuer.
- **Risque** : nul
- **Reversible** : oui

#### Étape 0.2 — Créer la branche et le tag de backup

- **Obj** : isoler le refactor sur une branche + pouvoir revenir en arrière.
- **Dépend** : 0.1
- **Touche** : git metadata (branche + tag).
- **Prompt** : `Dans D:\AlbugiMed, crée la branche refactor/architecture-v2 depuis main et crée le tag backup/pre-refactor-v2 sur le commit HEAD actuel de main. Ne pas push. Confirme avec git branch --show-current et git tag | grep backup.`
- **Valide** : branche courante = `refactor/architecture-v2`, tag `backup/pre-refactor-v2` existe.
- **Risque** : nul
- **Reversible** : oui (`git tag -d`, `git branch -D`)

#### Étape 0.3 — Backup Supabase `user_data` (manuel)

Étape manuelle — pas promptable. 3 options :

- **Option A — Dashboard** : Supabase → Table Editor → `user_data` → Export CSV → `D:\AlbugiMed\backups\user_data_YYYY-MM-DD.csv`
- **Option B — SQL Editor** : `SELECT * FROM user_data;` → Download CSV
- **Option C — Script Node** avec service role key → `backups/user_data_*.json`

**Valide** : fichier `backups/user_data_*.{csv,json}` non vide contenant au moins `med-pilot-subjects-v4`, `med-pilot-active-strategy`, `albugi-planning-slots`. `backups/` doit être dans `.gitignore` (**ne jamais commiter** — données perso).

---

### Phase 1 — Infrastructure partagée (≈ 1-2 j, 14 étapes)

#### Étape 1.1 — Créer `shared/config/storageKeys.ts`

- **Obj** : centraliser toutes les clés de stockage en constantes typées.
- **Dépend** : 0.2
- **Touche** : CRÉE `src/shared/config/storageKeys.ts`.
- **Prompt** : `Crée le fichier src/shared/config/storageKeys.ts qui exporte une constante STORAGE_KEYS as const contenant toutes les clés listées dans KNOWN_KEYS de src/hooks/useMigration.ts lignes 19-43. Structure-les par domaine (subjects, strategy, session, simulation, events, planning, home, chat). Ajoute un type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]. Ne modifie AUCUN autre fichier — c'est juste une création. Vérifie que le fichier compile avec tsc --noEmit.`
- **Valide** : `npm run build` compile.
- **Risque** : nul
- **Reversible** : oui

#### Étape 1.2 — Créer `shared/api/userDataRepository.ts` + tests

- **Obj** : façade générique sur la table Supabase `user_data`, testable et testée.
- **Dépend** : 1.1
- **Touche** : CRÉE `src/shared/api/userDataRepository.ts` + `src/shared/api/__tests__/userDataRepository.test.ts`.
- **Prompt** : `Crée src/shared/api/userDataRepository.ts qui exporte un objet userDataRepository avec 4 méthodes : get<T>(key: string): Promise<T | null>, set<T>(key: string, value: T): Promise<void>, remove(key: string): Promise<void>, batchGet(keys: string[]): Promise<Record<string, unknown>>. L'implémentation utilise createClient de src/utils/supabase/client. Si pas d'user connecté, get retourne null et set/remove retournent silencieusement (fire-and-forget). Toutes les erreurs Supabase sont loggées en console.warn avec le prefix [userDataRepository] mais ne throw pas. Crée aussi src/shared/api/__tests__/userDataRepository.test.ts avec vitest qui mock @/utils/supabase/client et teste : get sans user → null, set puis get → deep-equal, remove après set → null, batchGet avec 3 clés dont 1 absente → objet avec 2 entrées. Ne modifier aucun consommateur existant.`
- **Valide** : `npm test -- userDataRepository.test.ts` → tous les tests passent.
- **Risque** : faible (code neuf, non branché)
- **Reversible** : oui

#### Étape 1.3 — Déplacer `lib/utils.ts` → `shared/lib/cn.ts`

- **Obj** : déplacer `cn()` et `toLocalISOString` vers l'arbo cible, mettre à jour tous les imports.
- **Dépend** : 0.2
- **Touche** : SUPPRIME `src/lib/utils.ts`, CRÉE `src/shared/lib/cn.ts`, MODIFIE tous les fichiers qui importent `@/lib/utils`.
- **Prompt** : `Déplace src/lib/utils.ts vers src/shared/lib/cn.ts sans modifier son contenu. Puis fais un find-and-replace de "@/lib/utils" vers "@/shared/lib/cn" dans tout src/. Lance npm run build et npm test pour valider. Liste les fichiers modifiés.`
- **Valide** : `npm run build` compile, `npm test` passe.
- **Risque** : faible (juste des imports)
- **Reversible** : oui

#### Étape 1.4 — Déplacer `lib/validators.ts` → `shared/lib/validators.ts`

- **Obj** : idem, pour les validators (critiques pour backward-compat).
- **Dépend** : 0.2
- **Touche** : SUPPRIME `src/lib/validators.ts`, CRÉE `src/shared/lib/validators.ts`, update imports.
- **Prompt** : `Déplace src/lib/validators.ts vers src/shared/lib/validators.ts sans modifier son contenu. Find-and-replace "@/lib/validators" → "@/shared/lib/validators" partout dans src/. Lance npm run build et npm test.`
- **Valide** : build + tests OK.
- **Risque** : faible
- **Reversible** : oui

#### Étape 1.5 — Déplacer `lib/theme.ts` → `shared/lib/theme.ts`

- **Obj** : idem pour theme.
- **Dépend** : 0.2
- **Touche** : SUPPRIME `src/lib/theme.ts`, CRÉE `src/shared/lib/theme.ts`, update imports.
- **Prompt** : `Déplace src/lib/theme.ts vers src/shared/lib/theme.ts sans modifier son contenu. Find-and-replace "@/lib/theme" → "@/shared/lib/theme" partout. Lance npm run build.`
- **Valide** : build OK.
- **Risque** : faible
- **Reversible** : oui

#### Étape 1.6 — Déplacer `lib/sessionTiming.ts` → `entities/session-timing/model.ts`

- **Obj** : préparer l'entity session-timing avec son model pur.
- **Dépend** : 0.2
- **Touche** : SUPPRIME `src/lib/sessionTiming.ts`, CRÉE `src/entities/session-timing/model.ts`, update imports + tests existants.
- **Prompt** : `Déplace src/lib/sessionTiming.ts vers src/entities/session-timing/model.ts sans modifier son contenu. Déplace aussi src/lib/__tests__/sessionTiming.test.ts (s'il existe) vers src/entities/session-timing/__tests__/model.test.ts et adapte les imports internes. Find-and-replace "@/lib/sessionTiming" → "@/entities/session-timing/model" partout dans src/. Lance npm test pour valider que les tests existants passent toujours.`
- **Valide** : tests de `sessionTiming` (devenus `model.test.ts`) passent.
- **Risque** : faible
- **Reversible** : oui

#### Étape 1.7 — Extraire `toLocalISOString` vers `shared/lib/dates.ts`

- **Obj** : isoler les helpers de date pour pouvoir les étendre proprement.
- **Dépend** : 1.3
- **Touche** : CRÉE `src/shared/lib/dates.ts` + tests, MODIFIE `src/shared/lib/cn.ts`, update imports.
- **Prompt** : `Crée src/shared/lib/dates.ts. Déplace UNIQUEMENT la fonction toLocalISOString depuis src/shared/lib/cn.ts vers ce nouveau fichier (garde cn et clsx dans cn.ts). Crée src/shared/lib/__tests__/dates.test.ts avec 3 tests : toLocalISOString d'une date fixe, toLocalISOString cross-timezone (vérifier que ça prend la TZ locale, pas UTC), toLocalISOString avec une date à minuit. Find-and-replace "toLocalISOString" imports depuis "@/shared/lib/cn" vers "@/shared/lib/dates" partout dans src/. Build + tests doivent passer.`
- **Valide** : build + tests.
- **Risque** : faible
- **Reversible** : oui

#### Étape 1.8 — Créer `shared/hooks/useCloudValue.ts`

- **Obj** : nouveau hook avec API identique à `useCloudStorage` mais branché sur `userDataRepository`.
- **Dépend** : 1.2
- **Touche** : CRÉE `src/shared/hooks/useCloudValue.ts`.
- **Prompt** : `Crée src/shared/hooks/useCloudValue.ts. API publique identique à src/hooks/useCloudStorage.ts (useCloudValue<T>(key, defaultValue) → { data, save, saveWith, clear, isReady }). Mais l'implémentation utilise userDataRepository de @/shared/api/userDataRepository au lieu d'appeler supabase directement. Hydratation : 1) charge localStorage immédiatement, 2) au montage, appelle userDataRepository.get(key) et si non-null, écrase le local + met à jour le cache localStorage. save/saveWith écrivent local + userDataRepository.set. clear → localStorage.removeItem + userDataRepository.remove. Ne PAS modifier useCloudStorage pour l'instant. Ne PAS modifier aucun consommateur. Juste créer le nouveau hook.`
- **Valide** : `npm run build` compile.
- **Risque** : nul (code non branché)
- **Reversible** : oui

#### Étape 1.9 — Migrer `PlanningContext` vers `useCloudValue`

- **Obj** : premier consommateur migré — canari.
- **Dépend** : 1.8
- **Touche** : MODIFIE `src/context/PlanningContext.tsx`.
- **Prompt** : `Dans src/context/PlanningContext.tsx, remplace l'import "@/hooks/useCloudStorage" par "@/shared/hooks/useCloudValue" et remplace tous les appels useCloudStorage par useCloudValue. Ne change RIEN d'autre. Lance npm run build. Puis lance l'app en dev (npm run dev) et vérifie manuellement : ouvrir /planning, créer un événement one-off, rafraîchir la page, l'événement doit être toujours là.`
- **Valide** : build OK + smoke test planning.
- **Risque** : moyen (premier consommateur, valide le pattern)
- **Reversible** : oui

#### Étape 1.10 — Migrer `StrategyContext` vers `useCloudValue`

- **Obj** : même migration.
- **Dépend** : 1.9
- **Touche** : MODIFIE `src/context/StrategyContext.tsx`.
- **Prompt** : `Dans src/context/StrategyContext.tsx, remplace useCloudStorage par useCloudValue (import depuis @/shared/hooks/useCloudValue). Rien d'autre. Build + smoke test : ouvrir /cockpit, modifier la stratégie via StrategyModal, rafraîchir, vérifier que le changement est persisté.`
- **Valide** : build + smoke test strategy.
- **Risque** : moyen
- **Reversible** : oui

#### Étape 1.11 — Migrer `EventContext` vers `useCloudValue`

- **Obj** : idem.
- **Dépend** : 1.8
- **Touche** : MODIFIE `src/context/EventContext.tsx`.
- **Prompt** : `Dans src/context/EventContext.tsx, remplace useCloudStorage par useCloudValue. Rien d'autre. Build + smoke test : créer un événement agenda, rafraîchir, vérifier persistance.`
- **Valide** : build + smoke test events.
- **Risque** : faible
- **Reversible** : oui

#### Étape 1.12 — Migrer `EdnCountdown` et `TasksNotes` vers `useCloudValue`

- **Obj** : deux consommateurs simples dans home-widgets.
- **Dépend** : 1.8
- **Touche** : MODIFIE les fichiers source de ces deux composants.
- **Prompt** : `Trouve où EdnCountdown et TasksNotes sont définis (grep "EdnCountdown" et "TasksNotes" dans src/). Pour chacun, si ils utilisent useCloudStorage, remplace par useCloudValue (import depuis @/shared/hooks/useCloudValue). Rien d'autre. Build + smoke test : modifier la date EDN, écrire une note rapide, rafraîchir, vérifier persistance.`
- **Valide** : build + smoke test home.
- **Risque** : faible
- **Reversible** : oui

#### Étape 1.13 — Migrer `useSessionTimingStorage` vers `userDataRepository`

- **Obj** : éliminer les duplications `supabase.from('user_data').upsert(...)` dans ce hook.
- **Dépend** : 1.2
- **Touche** : MODIFIE `src/hooks/useSessionTimingStorage.ts` + test existant.
- **Prompt** : `Dans src/hooks/useSessionTimingStorage.ts, remplace tous les appels supabase.from('user_data').select/upsert/delete par userDataRepository.get/set/remove depuis @/shared/api/userDataRepository. Garde l'API publique du hook identique. Les tests src/hooks/__tests__/useSessionTimingStorage.test.tsx doivent continuer de passer — adapte les mocks si besoin (mocker @/shared/api/userDataRepository au lieu de @/utils/supabase/client). Build + npm test.`
- **Valide** : tests du hook passent.
- **Risque** : moyen
- **Reversible** : oui

#### Étape 1.14 — Supprimer `src/hooks/useCloudStorage.ts`

- **Obj** : nettoyage — plus aucun consommateur du vieux hook.
- **Dépend** : 1.9, 1.10, 1.11, 1.12
- **Touche** : SUPPRIME `src/hooks/useCloudStorage.ts`.
- **Prompt** : `Vérifie avec grep qu'aucun fichier dans src/ n'importe encore @/hooks/useCloudStorage. Si c'est le cas, supprime le fichier src/hooks/useCloudStorage.ts. Sinon, liste les fichiers qui l'importent encore. Build final pour confirmer.`
- **Valide** : build OK.
- **Risque** : nul (si la vérification grep est faite)
- **Reversible** : oui

**Fin Phase 1.** Tag `phase-1-done`. Smoke test complet.

---

### Phase 2 — Entities `subject` et `strategy` (≈ 1 j, 10 étapes)

#### Étape 2.1 — Créer `entities/subject/types.ts`

- **Obj** : déplacer les types Subject/Chapter/ChapterProgress.
- **Dépend** : phase 1 finie
- **Prompt** : `Crée src/entities/subject/types.ts qui contient les types Subject, Chapter, ChapterStatus, ChapterProgress actuellement définis dans src/context/SubjectContext.tsx (début du fichier). Importer ces types dans SubjectContext.tsx depuis le nouveau fichier au lieu de les déclarer inline. Ne rien d'autre. Build.`
- **Valide** : build OK. **Risque** : faible.

#### Étape 2.2 — Créer `entities/subject/model.ts` + tests

- **Dépend** : 2.1
- **Prompt** : `Lis src/context/SubjectContext.tsx et identifie toutes les fonctions pures (createDefaultProgress, ou toute autre fonction qui ne dépend pas du state React ni de Supabase). Crée src/entities/subject/model.ts qui exporte ces fonctions. Modifie SubjectContext.tsx pour les importer. Crée src/entities/subject/__tests__/model.test.ts avec des tests pour chaque fonction extraite. Build + npm test.`
- **Valide** : tests passent, build OK. **Risque** : faible.

#### Étape 2.3 — Créer `entities/subject/api.ts`

- **Dépend** : 2.1, 1.2
- **Prompt** : `Crée src/entities/subject/api.ts qui exporte loadSubjects(): Promise<Subject[] | null> et saveSubjects(subjects: Subject[]): Promise<void>. Utilise userDataRepository.get/set avec la clé STORAGE_KEYS.subjects (= "med-pilot-subjects-v4"). loadSubjects appelle aussi validateSubjects depuis @/shared/lib/validators. Ne pas modifier SubjectContext pour l'instant. Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 2.4 — Migrer `SubjectContext` pour utiliser `entities/subject/api.ts`

- **Dépend** : 2.3
- **Prompt** : `Dans src/context/SubjectContext.tsx, remplace la logique d'hydratation localStorage + fetch Supabase par un appel à loadSubjects(). Remplace la logique de persistance par saveSubjects(subjects). Garder l'API publique useSubjects() et le Provider identiques. Build + smoke test : app démarre, SubjectsView affiche, créer une matière et rafraîchir fonctionne.`
- **Valide** : build + smoke test. **Risque** : moyen.

#### Étape 2.5 — Créer `entities/subject/hooks.ts` (wrapper du Context)

- **Dépend** : 2.4
- **Prompt** : `Crée src/entities/subject/hooks.ts qui re-exporte useSubjects et SubjectProvider depuis @/context/SubjectContext. Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 2.6 — Migrer tous les imports de `SubjectContext`

- **Dépend** : 2.5
- **Prompt** : `Find-and-replace global : tous les imports de "@/context/SubjectContext" qui importent useSubjects ou SubjectProvider doivent devenir "@/entities/subject/hooks". EXCEPTION : le fichier Context lui-même et hooks.ts. Build + npm test.`
- **Valide** : build + tests. **Risque** : faible.

#### Étape 2.7 — Créer `entities/strategy/types.ts` + `model.ts` + tests

- **Dépend** : phase 1 finie
- **Prompt** : `Crée src/entities/strategy/types.ts avec les types ActiveStrategy, DayLoad, StrategyMode. Crée src/entities/strategy/model.ts avec les fonctions pures (createEmptyStrategy, validateStrategy si elle existe). Crée un test minimal. Build + tests.`
- **Valide** : build + tests. **Risque** : faible.

#### Étape 2.8 — Créer `entities/strategy/api.ts`

- **Dépend** : 2.7, 1.2
- **Prompt** : `Crée src/entities/strategy/api.ts avec loadStrategy et saveStrategy via userDataRepository et la clé "med-pilot-active-strategy". Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 2.9 — Migrer `StrategyContext` vers `entities/strategy/api.ts`

- **Dépend** : 2.8
- **Prompt** : `Dans src/context/StrategyContext.tsx, remplace la logique de load/save par loadStrategy/saveStrategy. Garder l'API publique identique. Build + smoke test.`
- **Valide** : build + smoke test. **Risque** : moyen.

#### Étape 2.10 — Créer `entities/strategy/hooks.ts` et migrer les imports

- **Dépend** : 2.9
- **Prompt** : `Crée src/entities/strategy/hooks.ts qui re-exporte useStrategy et StrategyProvider. Find-and-replace "@/context/StrategyContext" → "@/entities/strategy/hooks" sauf dans les 2 fichiers sources. Build + tests.`
- **Valide** : build + tests. **Risque** : faible.

**Fin Phase 2.** Tag `phase-2-done`. Smoke test.

---

### Phase 3 — Session Engine refactor (≈ 2-3 j, 10 étapes, le plus délicat)

#### Étape 3.1 — Installer Zustand

- **Dépend** : phase 2 finie
- **Prompt** : `Dans D:\AlbugiMed, installe zustand en dépendance de prod : npm install zustand. Vérifie que package.json contient bien la nouvelle entrée et que npm run build continue de fonctionner.`
- **Valide** : build OK, `zustand` dans `dependencies`. **Risque** : nul.

#### Étape 3.2 — Créer `entities/session/types.ts`

- **Dépend** : 3.1
- **Prompt** : `Crée src/entities/session/types.ts avec le contenu de src/types/session.ts (déplacement pur). Find-and-replace "@/types/session" → "@/entities/session/types" dans tout src/. Build + tests.`
- **Valide** : build + tests. **Risque** : faible.

#### Étape 3.3 — Créer `entities/session/model.ts` (copie, sans toucher SessionEngineContext)

- **Dépend** : 3.2
- **Prompt** : `Lis src/context/SessionEngineContext.tsx. Copie (NE PAS déplacer) les fonctions pures vers src/entities/session/model.ts : makeTaskId, categoriseChapter, chapterPriority, getAnnaleLevel, buildChapterTasks, getTargetSubjects, generateDailyTasks. Paramètre chapterPriority et generateDailyTasks pour accepter un now?: Date optionnel (défaut = new Date()). Ajoute 3 helpers : computeTotalElapsedMs(session), findCurrentTaskIndex(session), applyTaskCompletion(task, rating, now) qui retourne { taskUpdates, chapterProgressUpdates, historyEntry } sans effet de bord. Ne modifier AUCUN autre fichier. Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 3.4 — Tests pour `entities/session/model.ts`

- **Dépend** : 3.3
- **Prompt** : `Crée src/entities/session/__tests__/model.test.ts avec : (1) categoriseChapter × 4 (vierge, cours entamé, avancé, révision), (2) chapterPriority × 3 (ordre score, difficulté red vs blue, lastWorkedDate), (3) getAnnaleLevel × 4, (4) buildChapterTasks × 3, (5) generateDailyTasks × 9 (3 loads × 3 états pool), (6) applyTaskCompletion × 2 (cours, annale niv 1-4). Fixtures inline. now injecté. Si un test rate car comportement inattendu, documente sans modifier model.ts.`
- **Valide** : tests passent ou échecs documentés. **Risque** : nul.

#### Étape 3.5 — Créer `entities/session/api.ts`

- **Dépend** : 3.2, 1.2
- **Prompt** : `Crée src/entities/session/api.ts avec loadDailySession, saveDailySession, clearDailySession, loadSessionHistory, appendSessionHistory. Tout via userDataRepository avec les clés "med-pilot-daily-session" et "med-pilot-session-history". appendSessionHistory lit, ajoute, tronque à 500, ré-écrit. Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 3.6 — Créer `entities/session/store.ts` (Zustand)

- **Dépend** : 3.3, 3.5
- **Prompt** : `Crée src/entities/session/store.ts. Store Zustand avec create() + persist middleware. State : { session, isHydrated }. Actions : generateSession(strategy, subjects, load) (appelle model.generateDailyTasks), startCurrentTask(), completeCurrentTask(rating) (appelle model.applyTaskCompletion, retourne les chapterProgressUpdates au caller), skipCurrentTask(), hydrate() (api.loadDailySession). Persist middleware : custom storage qui wrap userDataRepository. Ne PAS lire un autre store directement. Build.`
- **Valide** : build OK. **Risque** : faible.

#### Étape 3.7 — Créer `entities/session/hooks.ts` (selectors)

- **Dépend** : 3.6
- **Prompt** : `Crée src/entities/session/hooks.ts qui exporte useDailySession, useCurrentTask, useAllDone, useTotalElapsed, useHasSessionToday, useSessionActions (shallow), useSessionHydrated. Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 3.8 — Transformer `SessionEngineContext.tsx` en façade Zustand (PIVOT CRITIQUE)

- **Dépend** : 3.7
- **Prompt** : `Réécris src/context/SessionEngineContext.tsx comme façade au-dessus du store Zustand. L'API publique useSessionEngine() DOIT retourner exactement la même forme. Le Provider devient un fragment qui appelle useSessionStore.getState().hydrate() au mount. ATTENTION : completeCurrentTask doit préserver le comportement : 1) appeler l'action du store qui retourne les chapterProgressUpdates, 2) appeler updateChapterProgress de useSubjects, 3) appeler api.appendSessionHistory. Supprimer toutes les fonctions pures locales du Context et toute la logique d'hydratation/persistance directe. Build + smoke test CRITIQUE : générer une session, compléter une tâche avec rating, vérifier (a) done, (b) progress mise à jour, (c) historique, (d) rafraîchir restaure.`
- **Valide** : build + smoke test manuel complet.
- **Risque** : **élevé** — pivot. Si ça casse, revert immédiat.
- **Reversible** : oui

#### Étape 3.9 — Retirer les fonctions pures dupliquées si 3.8 les a laissées

- **Dépend** : 3.8 validée
- **Prompt** : `Vérifie qu'il ne reste AUCUNE des fonctions pures en local dans SessionEngineContext.tsx (elles viennent de @/entities/session/model). Vérifie qu'il n'y a plus de persistance directe. Build + tests.`
- **Valide** : build + tests. **Risque** : faible.

#### Étape 3.10 — Basculer SessionWidget + HomeView sur les selectors directs

- **Dépend** : 3.9
- **Prompt** : `Dans SessionWidget et HomeView, remplace useSessionEngine() par les selectors granulaires de @/entities/session/hooks. Ne pas modifier les autres consommateurs. Build + smoke test cockpit complet.`
- **Valide** : build + smoke test. **Risque** : moyen.

**Fin Phase 3.** Tag `phase-3-done`. La façade SessionEngineContext continue d'exister pour les autres consommateurs (supprimée en Phase 7).

---

### Phase 4 — Routes Next.js (≈ 1 j, 11 étapes)

#### Étape 4.1 — Lire et documenter le middleware auth actuel

- **Dépend** : phase 3 finie
- **Prompt** : `Lis src/middleware.ts et src/utils/supabase/middleware.ts. Résume en 5 lignes : (1) routes protégées, (2) où se fait le redirect, (3) routes publiques, (4) matcher. Je dois savoir ça avant de créer /cockpit, /planning, etc.`
- **Valide** : résumé fourni. **Risque** : nul.

#### Étape 4.2 — Créer `src/app/providers.tsx`

- **Dépend** : 4.1
- **Prompt** : `Crée src/app/providers.tsx avec "use client". Exporte AppProviders({ children }) qui enveloppe children dans les mêmes providers que LayoutShell : SubjectProvider → EventProvider → PlanningProvider → StrategyProvider → SessionEngineProvider → ViewProvider. Ne PAS inclure TopNav ni le fond. Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 4.3 — Créer `src/app/(app)/layout.tsx` (AppShell)

- **Dépend** : 4.2
- **Prompt** : `Crée src/app/(app)/layout.tsx avec "use client" et l'AppShell : TopNav + div fond + main wrap children. Récupère le contenu depuis LayoutShell (partie après les providers). Inclut MigrationRunner. Ne pas wrap dans providers — c'est au root layout. Build.`
- **Valide** : build OK. **Risque** : faible.

#### Étape 4.4 — Créer `src/app/(app)/cockpit/page.tsx`

- **Dépend** : 4.3
- **Prompt** : `Crée src/app/(app)/cockpit/page.tsx avec "use client" qui importe et rend <HomeView />. Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 4.5 — Créer `src/app/(app)/{subjects,planning,simulation}/page.tsx`

- **Dépend** : 4.3
- **Prompt** : `Crée 3 fichiers selon le même pattern : subjects → <SubjectsView />, planning → <PlanningView />, simulation → <SimulationView />. Tous "use client". Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 4.6 — Mettre à jour `src/app/layout.tsx` pour utiliser `AppProviders`

- **Dépend** : 4.2
- **Prompt** : `Dans src/app/layout.tsx (RootLayout serveur), wrap {children} dans <AppProviders>. NE PAS encore supprimer LayoutShell — l'ancien app/page.tsx continue de l'utiliser. Build. Vérifie que / démarre toujours.`
- **Valide** : build + app démarre. **Risque** : moyen.

#### Étape 4.7 — Transformer `src/app/page.tsx` en redirect vers `/cockpit`

- **Dépend** : 4.4, 4.6
- **Prompt** : `Réécris src/app/page.tsx comme Server Component qui fait redirect('/cockpit'). Plus de useView, plus de switch, plus de "use client". Build + test : / redirige bien.`
- **Valide** : build + test nav. **Risque** : moyen.

#### Étape 4.8 — Migrer `TopNav` de `useView()` à `usePathname()`/`Link`

- **Dépend** : 4.4, 4.5, 4.7
- **Prompt** : `Dans TopNav.tsx, remplace useView() par usePathname() + useRouter(). Items → <Link href="/cockpit">, etc. Actif via pathname.startsWith. Build + test nav complet.`
- **Valide** : build + test nav. **Risque** : moyen.

#### Étape 4.9 — Remplacer tous les `setActiveView(...)` restants par `router.push(...)`

- **Dépend** : 4.8
- **Prompt** : `Grep "setActiveView" dans src/ et remplace chaque occurrence par router.push('/route-correspondante'). Ajoute useRouter() en tête du composant. Build + test manuel.`
- **Valide** : build + test. **Risque** : faible.

#### Étape 4.10 — Supprimer `ViewContext` et nettoyer `LayoutShell`

- **Dépend** : 4.9
- **Prompt** : `Vérifie avec grep qu'il n'y a plus aucun useView. Si clean : supprime src/context/ViewContext.tsx, retire ViewProvider de providers.tsx et LayoutShell. Si LayoutShell n'a plus d'import, supprime-le. Build final.`
- **Valide** : build + nav complète. **Risque** : faible.

#### Étape 4.11 — Smoke test middleware auth avec login frais

- **Dépend** : 4.10
- **Prompt** : `Smoke test manuel : (1) logout, (2) /cockpit sans auth → redirect /login, (3) idem /planning, /subjects, /simulation, (4) login OK, (5) redirection après login OK, (6) nav entre 4 routes, (7) /login et /restore accessibles sans auth. Si une route n'est pas protégée, ajuste matcher dans middleware.ts.`
- **Valide** : toutes routes protégées, login/restore publiques.
- **Risque** : élevé.

**Fin Phase 4.** Tag `phase-4-done`. Smoke test complet.

---

### Phase 5 — Refactor `PlanningView` (≈ 2-3 j, 15 étapes)

#### Étape 5.1 — Créer `entities/planning/types.ts`

- **Dépend** : phase 4 finie
- **Prompt** : `Crée src/entities/planning/types.ts. Déplace le contenu de src/types/planning.ts (RecurrentSlot, PlanningEvent, etc.). Ajoute les types inline de PlanningView.tsx : GridItem, ModalData, ViewMode. Update imports. Build.`
- **Valide** : build OK. **Risque** : faible.

#### Étape 5.2 — Créer `entities/planning/model.ts` (copies pures)

- **Dépend** : 5.1
- **Prompt** : `Crée src/entities/planning/model.ts. Copie (pas déplacer) depuis PlanningView.tsx toutes les fonctions pures : timeToMinutes, minutesToTime, timeToTop, durationToHeight, addHourHelper, toISODate, addDays, formatWeekRange, getMonday, layoutOverlaps, parseNLPInput, buildCalendarMonth, buildWeekDays, getRecurrentSlotsForDate, expandRecurrentSlotsForRange. Paramètre parseNLPInput pour accepter un now?: Date optionnel. Ne pas modifier PlanningView encore. Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 5.3 — Tests pour `entities/planning/model.ts`

- **Dépend** : 5.2
- **Prompt** : `Crée src/entities/planning/__tests__/model.test.ts : (1) layoutOverlaps × 4 (0, 2, 3, 5 overlaps), (2) parseNLPInput × 5 ("demain 14h révision cardio", "22 avril 9h DP", texte seul, vide, "lundi prochain 18h"), (3) buildCalendarMonth × 3 (lundi, dimanche, bissextile), (4) timeToMinutes/minutesToTime round-trip × 2. Lance npm test.`
- **Valide** : tests passent ou échecs documentés. **Risque** : nul.

#### Étape 5.4 — Créer `entities/planning/api.ts`

- **Dépend** : 5.1, 1.2
- **Prompt** : `Crée src/entities/planning/api.ts avec loadRecurrentSlots, saveRecurrentSlots, loadPlanningEvents, savePlanningEvents, loadDeadlines, saveDeadlines. Clés : "albugi-planning-slots", "albugi-planning-events", "albugi-planning-deadlines". Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 5.5 — Migrer `PlanningView` pour utiliser `entities/planning/model.ts`

- **Dépend** : 5.2, 5.3
- **Prompt** : `Dans PlanningView.tsx, supprime les définitions locales des fonctions pures (timeToMinutes...getRecurrentSlotsForDate) et importe-les depuis @/entities/planning/model. Le fichier doit passer de ~1424 à ~1200 lignes. Build + smoke test complet week/calendar/recurrent + NLP + drag.`
- **Valide** : build + smoke test. **Risque** : moyen.

#### Étape 5.6 — Extraire `features/planning-grid/GridBlock.tsx`

- **Dépend** : 5.5
- **Prompt** : `Déplace le composant GridBlock inline de PlanningView.tsx vers src/features/planning-grid/GridBlock.tsx. Import types depuis @/entities/planning/types. Import dans PlanningView. Build + smoke test vue week.`
- **Valide** : build + vue week. **Risque** : faible.

#### Étape 5.7 — Extraire `features/planning-grid/EventModal.tsx`

- **Dépend** : 5.6
- **Prompt** : `Déplace EventModal vers src/features/planning-grid/EventModal.tsx. Import types entities/planning. Import dans PlanningView. Build + smoke test : clic créneau ouvre modal.`
- **Valide** : build + modal. **Risque** : faible.

#### Étape 5.8 — Extraire `features/planning-grid/NLPQuickAdd.tsx`

- **Dépend** : 5.6
- **Prompt** : `Extrait la zone d'input NLP + feedback vers src/features/planning-grid/NLPQuickAdd.tsx avec props onEventCreate. Le composant importe parseNLPInput de model. Build + smoke test NLP.`
- **Valide** : build + NLP. **Risque** : moyen.

#### Étape 5.9 — Extraire `features/planning-grid/PlanningGrid.tsx`

- **Dépend** : 5.6, 5.7
- **Prompt** : `Extrait toute la portion "mode week" (JSX + state : currentWeekStart, weekNavigation) dans src/features/planning-grid/PlanningGrid.tsx. Dans PlanningView, mode week → <PlanningGrid />. Build + smoke test week.`
- **Valide** : build + vue week. **Risque** : moyen.

#### Étape 5.10 — Extraire `features/planning-calendar/MonthlyCalendar.tsx`

- **Dépend** : 5.5
- **Prompt** : `Extrait le mode "calendar" vers src/features/planning-calendar/MonthlyCalendar.tsx. Si logique nav mois complexe, crée useMonthView.ts. Importe buildCalendarMonth du model. Build + smoke test mois.`
- **Valide** : build + vue mois. **Risque** : moyen.

#### Étape 5.11 — Extraire `features/planning-recurrent/RecurrentSlotsList.tsx`

- **Dépend** : 5.5
- **Prompt** : `Extrait le mode "recurrent" (liste + toggle/edit/delete) vers src/features/planning-recurrent/RecurrentSlotsList.tsx. Build + smoke test.`
- **Valide** : build + recurrent. **Risque** : moyen.

#### Étape 5.12 — Déplacer `RecurrentSlotDialog`

- **Dépend** : 5.11
- **Prompt** : `Déplace src/components/features/plan/RecurrentSlotDialog.tsx vers src/features/planning-recurrent/RecurrentSlotDialog.tsx. Find-and-replace imports. Build + smoke test.`
- **Valide** : build + dialog. **Risque** : faible.

#### Étape 5.13 — Créer `entities/planning/hooks.ts`

- **Dépend** : 5.4
- **Prompt** : `Crée src/entities/planning/hooks.ts qui re-exporte usePlanning, PlanningProvider + hooks dérivés useRecurrentSlots, useOneOffEvents, useDeadlines. Build.`
- **Valide** : build OK. **Risque** : nul.

#### Étape 5.14 — Remplacer `app/(app)/planning/page.tsx` par l'orchestrateur fin

- **Dépend** : 5.9, 5.10, 5.11
- **Prompt** : `Réécris src/app/(app)/planning/page.tsx en ~80 lignes : "use client", useState<ViewMode>("week"), header avec onglets, conditional rendering des 3 features. Supprime src/components/views/PlanningView.tsx. Build + smoke test COMPLET.`
- **Valide** : build + smoke test.
- **Risque** : élevé.

#### Étape 5.15 — Extraire `useDragAndDrop.ts`

- **Dépend** : 5.9
- **Prompt** : `Si drag & drop encore inline dans PlanningGrid, extrait dans src/features/planning-grid/useDragAndDrop.ts (retourne { draggedItem, handlers }). Build + smoke test drag.`
- **Valide** : build + drag. **Risque** : moyen.

**Fin Phase 5.** Tag `phase-5-done`. `PlanningView.tsx` supprimé.

---

### Phase 6 — `HomeView` + `SubjectsView` + `SimulationView` (≈ 1-2 j, 7 étapes)

#### Étape 6.1 — Extraire `features/home-widgets/StatsBar.tsx`

- **Dépend** : phase 5 finie
- **Prompt** : `Dans HomeView.tsx, extrait la barre de stats en haut vers src/features/home-widgets/StatsBar.tsx. Build + smoke test.`
- **Risque** : faible.

#### Étape 6.2 — Extraire `features/home-widgets/EdnCountdown.tsx`

- **Dépend** : 6.1
- **Prompt** : `Extrait EdnCountdown (utilise useCloudValue avec "med-pilot-edn-date") depuis HomeView vers src/features/home-widgets/EdnCountdown.tsx. Build + smoke test.`
- **Risque** : faible.

#### Étape 6.3 — Extraire `features/home-widgets/TasksNotes.tsx`

- **Dépend** : 6.1
- **Prompt** : `Extrait TasksNotes depuis HomeView vers src/features/home-widgets/TasksNotes.tsx. Build + smoke test : ajouter tâche, écrire note.`
- **Risque** : faible.

#### Étape 6.4 — Extraire `features/home-widgets/RecentErrors.tsx`

- **Dépend** : 6.1
- **Prompt** : `Extrait RecentErrors (5 dernières erreurs + clic → /simulation) vers src/features/home-widgets/RecentErrors.tsx. Build + smoke test.`
- **Risque** : faible.

#### Étape 6.5 — Remplacer `HomeView` par `cockpit/page.tsx` directement

- **Dépend** : 6.1-6.4
- **Prompt** : `Réécris cockpit/page.tsx en assemblant directement StatsBar, SessionWidget, WeeklyTracker, EdnCountdown, TasksNotes, RecentErrors, QuickActions. Garde grille grid-cols-1 lg:grid-cols-[1fr_320px]. Supprime src/components/views/HomeView.tsx. Build + smoke test cockpit.`
- **Risque** : moyen.

#### Étape 6.6 — Déplacer les composants subject dans `features/subject-list/`

- **Dépend** : phase 5 finie
- **Prompt** : `Déplace SubjectCard, AddSubjectModal, SubjectDetailModal de src/components/features/subjects/ vers src/features/subject-list/. Find-and-replace imports. Build + smoke test.`
- **Risque** : faible.

#### Étape 6.7 — Remplacer `SubjectsView` et `SimulationView` par leurs pages

- **Dépend** : 6.6
- **Prompt** : `Réécris subjects/page.tsx pour contenir directement le JSX. Idem simulation/page.tsx. Supprime src/components/views/{SubjectsView,SimulationView}.tsx. Build + smoke test.`
- **Risque** : moyen.

**Fin Phase 6.** Tag `phase-6-done`. Smoke test.

---

### Phase 7 — Gros composants features (≈ 2 j, 10 étapes)

#### Étape 7.1 — Extraire `features/session-widget/DayLoadSelector.tsx`

- **Prompt** : `Dans SessionWidget.tsx, extrait le sélecteur DayLoad vers src/features/session-widget/DayLoadSelector.tsx. Build + smoke test.`
- **Risque** : faible.

#### Étape 7.2 — Extraire `features/session-widget/DifficultySelector.tsx`

- **Prompt** : `Extrait le DifficultySelector (blue/green/orange/red) vers src/features/session-widget/DifficultySelector.tsx. Build + smoke test.`
- **Risque** : faible.

#### Étape 7.3 — Extraire `features/session-widget/SessionTimer.tsx`

- **Prompt** : `Extrait le timer d'affichage (useTimer + render) vers src/features/session-widget/SessionTimer.tsx. Build + smoke test timer.`
- **Risque** : faible.

#### Étape 7.4 — Déplacer `SessionWidget` vers `features/session-widget/`

- **Prompt** : `Déplace src/components/features/session/SessionWidget.tsx vers src/features/session-widget/SessionWidget.tsx. Find-and-replace imports. Build + smoke test session complet.`
- **Risque** : moyen.

#### Étape 7.5 — Extraire `features/strategy-picker/` depuis `StrategyModal`

- **Prompt** : `Dans StrategyModal.tsx (487 lig), extrait vers src/features/strategy-picker/ : StrategyModal.tsx, ModeTabs.tsx, SubjectMultiSelect.tsx. Import dans consommateurs. Build + smoke test.`
- **Risque** : moyen.

#### Étape 7.6 — Créer `entities/simulation/`

- **Prompt** : `Crée src/entities/simulation/{types,gemini,model,api}.ts. types.ts : ChatMessage, ErrorEntry. gemini.ts : wrapper autour de @google/generative-ai avec askGemini(prompt, history). model.ts : extractErrorCapture (parse [CAPTURE_ERREUR]) et buildAnkiTsv. api.ts : load/save error-bank + chat-history. Tests unitaires pour extractErrorCapture et buildAnkiTsv. Build + tests.`
- **Risque** : moyen.

#### Étape 7.7 — Migrer `SimulatorChat` vers `features/simulator-chat/` avec `entities/simulation`

- **Prompt** : `Déplace SimulatorChat.tsx vers src/features/simulator-chat/SimulatorChat.tsx. Remplace appels directs @google/generative-ai par askGemini. Remplace extraction erreur par extractErrorCapture. Remplace persistance par api. Build + smoke test chat + capture erreur.`
- **Risque** : élevé.

#### Étape 7.8 — Extraire `features/simulator-chat/ChatMessage.tsx`

- **Prompt** : `Si SimulatorChat a un sous-composant MessageBubble / ChatMessage inline, extrait vers src/features/simulator-chat/ChatMessage.tsx. Build + smoke test.`
- **Risque** : faible.

#### Étape 7.9 — Déplacer `ErrorPanel` vers `features/error-panel/`

- **Prompt** : `Déplace ErrorPanel.tsx vers src/features/error-panel/ErrorPanel.tsx. Utilise entities/simulation/api pour le chargement. Build + smoke test.`
- **Risque** : faible.

#### Étape 7.10 — Extraire `features/simulator-chat/AnkiExport.tsx`

- **Prompt** : `Si logique export Anki inline, extrait bouton + logique vers src/features/simulator-chat/AnkiExport.tsx. Build + smoke test export TSV.`
- **Risque** : faible.

**Fin Phase 7.** Tag `phase-7-done`.

---

### Phase 8 — Finition (≈ 0.5 j, 6 étapes)

#### Étape 8.1 — Supprimer `src/context/` s'il est vide

- **Prompt** : `Grep "@/context/" dans src/. Liste les fichiers encore consommés. Si seul ThemeContext reste, c'est OK. Sinon migre les derniers. Puis supprime les fichiers sans consommateur. Rapporte l'état.`
- **Risque** : moyen.

#### Étape 8.2 — Supprimer `src/components/views/`

- **Prompt** : `Vérifie que src/components/views/ est vide. Supprime le dossier. Build.`
- **Risque** : nul.

#### Étape 8.3 — Supprimer `src/components/features/` ancien

- **Prompt** : `Vérifie que src/components/features/ ne contient plus rien. Déplace les retardataires (ex : MigrationRunner → src/features/migration-notice/). Supprime. Build.`
- **Risque** : faible.

#### Étape 8.4 — Supprimer `src/types/` et `src/hooks/` anciens

- **Prompt** : `Grep pour vérifier que src/types/ et src/hooks/ ne sont plus consommés. Déplace les retardataires vers entities/*/types.ts ou shared/hooks/. Supprime. Build + tests.`
- **Risque** : faible.

#### Étape 8.5 — Ajouter `eslint-plugin-boundaries`

- **Prompt** : `Installe eslint-plugin-boundaries. Configure dans .eslintrc pour interdire : features/* → app/*, entities/* → features/*, entities/* → app/*, shared/* → entities/features/app. npm run lint. Corrige les violations.`
- **Risque** : moyen.

#### Étape 8.6 — Écrire `ARCHITECTURE.md`

- **Prompt** : `Crée D:\AlbugiMed\ARCHITECTURE.md. Contenu : (1) diagramme 4 couches, (2) règle d'import, (3) templates pour ajouter widget / route / entité, (4) pattern userDataRepository, (5) stratégie tests (model.ts purs + hooks intégration), (6) lien vers docs/REFACTOR_PLAN.md. Pas de code.`
- **Risque** : nul.

**Fin Phase 8.** Tag `phase-8-done` + tag final `refactor-v2-complete`. Merge en main après smoke test final.

---

## 9. Smoke test complet (à chaque fin de phase à risque moyen/élevé)

1. Login frais avec un compte de test
2. Dashboard : `SessionWidget` affiche une session du jour
3. Démarrer une tâche → timer tourne
4. Compléter avec rating → progress mis à jour dans Subject
5. `WeeklyTracker` reflète l'avancée
6. Navigation Planning → grille semaine affiche les événements
7. Créer un événement via NLP quick-add ("demain 14h révision cardio")
8. Mode calendar (mensuel) fonctionne
9. Mode recurrent (liste créneaux) fonctionne
10. Navigation Simulation → `SimulatorChat` répond, capture d'erreur OK
11. Logout → login → état restauré depuis Supabase

## 10. Risques critiques et invariants

### Invariants à ne JAMAIS casser

1. **Clés de stockage Supabase inchangées** — `med-pilot-*`, `albugi-*`, `dp_*` restent littéralement identiques. `storageKeys.ts` ne renomme rien.
2. **Format sérialisé inchangé** — nouveaux champs = optionnels + validator tolérant. Pas de migration de schéma pendant le refactor.
3. **`shared/lib/validators.ts` appelé au chargement** — continuer de valider les données pour tolérer les anciens formats.
4. **Singleton Supabase client** — `shared/api/supabaseClient.ts` reste un singleton. Plusieurs instances = erreur *"Lock broken by another request with the 'steal' option"*.
5. **Aucun store Zustand ne lit un autre store** — les actions reçoivent les données en paramètres, composées par le hook d'orchestration. `generateDailyTasks(strategy, subjects, load)` est déjà la bonne forme.

### Risques de phase

- **Phase 1** : régressions persistance si `userDataRepository` bugué → tests unitaires AVANT toute migration (étape 1.2).
- **Phase 3 étape 3.8** : le pivot. Si casse → revert immédiat et redécoupe.
- **Phase 4 étape 4.6** : stores démontés si providers mal placés. Solution : providers dans RootLayout, pas dans pages.
- **Phase 4 étape 4.11** : auth breaker. Ajuster matcher du middleware si routes non protégées.
- **Phase 5 étape 5.14** : fichier principal remplacé. Smoke test intensif.
- **Phase 7 étape 7.7** : SimulatorChat complexe (IA + capture erreur + persistance).

## 11. Critère de succès final

- [ ] `PlanningView.tsx` 1424 lig → plus gros fichier du module ≤ 250 lig
- [ ] `SessionEngineContext.tsx` 496 lig → `model.ts` 100 % testable
- [ ] `LayoutShell` 5 niveaux de providers → 1 niveau (`AppProviders`)
- [ ] 6 duplications Supabase → 1 seul repository
- [ ] Tests : 4 fichiers → ~15 couvrant les points chauds métier
- [ ] Toutes les données Supabase existantes continuent de se charger (round-trip testé)
- [ ] Règle de test : « ajouter une nouvelle feature » suit un template clair (1 dossier `entities/`, 1 dossier `features/`, 1 route)
- [ ] `eslint-plugin-boundaries` actif et vert
- [ ] `ARCHITECTURE.md` à la racine

## 12. Fichiers critiques à lire avant implémentation

Les ancres du refactor. Si ces fichiers sont touchés correctement, le reste suit.

- `src/context/SessionEngineContext.tsx` — source de `entities/session/model.ts` + `store.ts` (extraction la plus rentable du projet)
- `src/components/views/PlanningView.tsx` (1424 lig) — source de `entities/planning/model.ts` + `features/planning-grid/` (plus gros code split)
- `src/hooks/useCloudStorage.ts` — template pour `shared/hooks/useCloudValue.ts`
- `src/components/layout/LayoutShell.tsx` — provider hell actuel (5 niveaux) → devient `app/(app)/layout.tsx` + `app/providers.tsx`
- `src/hooks/useMigration.ts` — contient déjà `KNOWN_KEYS` (lignes 19-43). Point de départ pour `shared/config/storageKeys.ts`.
- `src/context/SubjectContext.tsx` — source de `entities/subject/*` (Phase 2, cas simple pour prouver le pattern)
