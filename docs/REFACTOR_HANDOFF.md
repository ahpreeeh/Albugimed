# AlbugiMed — Refactor Handoff (état courant)

> **État réel du refactor.** Document vivant, mis à jour après chaque lot d'étapes validé. Couplé à `REFACTOR_PLAN.md` qui est la référence figée.

**Dernière mise à jour** : 2026-04-19 (Phase 1 validée côté pratique — smoke user OK, Phase 2 cadrée en 6 lots)
**Mise à jour par** : Claude (session interactive)

---

## 1. Snapshot git

| Champ | Valeur |
|---|---|
| Branche courante | `refactor/architecture-v2` |
| Base | `main` |
| Tag de rollback | `backup/pre-refactor-v2` (HEAD pristine de `main` avant tout refactor) |
| Tag fin Phase 1 | `phase-1-done` sur `e853cac` (point de rollback propre avant Phase 2) |
| HEAD de la branche refactor | `e853cac` (step 1.14, voir `git log --oneline -20`) |
| Remote push | **non pushé** — tout est local |
| Tests | 6 fichiers / 39 tests / 0 échec |
| Build Next.js | ✅ OK (6 routes statiques, middleware 79.6 kB) |
| Smoke test Phase 1 | ✅ validé par le user (modifs dans l'app, pas de crash, sauvegarde Supabase OK) |

### Commits sur la branche refactor (du plus récent au plus ancien)

```
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

### Phases 3 à 8

**Non commencées.** Voir `REFACTOR_PLAN.md` pour le détail.

### Phase 2 — Entities layer `subject` + `strategy`

**État** : cadrée en 6 lots (F → K, 10 steps atomiques 2.1 → 2.10). Voir §5b pour le tableau détaillé. **Lot recommandé en priorité : Lot F** (Subject foundation, risque zéro). Exécution non commencée.

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

## 4. Prochain lot à exécuter — **Lot F (Phase 2, Subject foundation)**

Phase 1 est **validée** (13 étapes + 1.14 conditionnellement reportée). Smoke test utilisateur OK. Tag `phase-1-done` posé sur `e853cac`. On démarre la **Phase 2 : Entities layer pour `subject` et `strategy`**.

**Asymétrie à exploiter** : `StrategyContext` (59 lig) utilise déjà `useCloudValue` après l'étape 1.10 — **aucun Supabase hand-rolled à nettoyer**. `SubjectContext` (299 lig) conserve encore son hand-rolled Supabase (L106-111 select, L133-145 upsert). → Subject demande 6 steps, Strategy seulement 4.

### Lot F — Subject foundation (steps 2.1 + 2.2)

Risque : **faible**. Pure addition, aucun consommateur touché.

| Step | Action | Fichiers créés | Tests |
|---|---|---|---|
| 2.1 | Créer `entities/subject/types.ts` en **copiant** les types de `SubjectContext.tsx` L17-50 (`ChapterStatus`, `ChapterProgress`, `Chapter`, `Subject`). Conserver la compat en ré-exportant depuis `SubjectContext.tsx`. | `src/entities/subject/types.ts` | — |
| 2.2 | Créer `entities/subject/model.ts` en extrayant `createDefaultProgress()` (L69-81) + ajouter `computeProgress(chapter)` qui dérive `{courseStartedCount, level1Count, fullCount}` pour futurs widgets. `SubjectContext.tsx` ré-importe `createDefaultProgress` depuis le model. | `src/entities/subject/model.ts`, `src/entities/subject/__tests__/model.test.ts` (~60 lig) | ✅ à écrire |

**Vérification Lot F** : `npm test` → 41 tests verts (39 + 2 nouveaux), `npm run build` vert, `git diff src/context/SubjectContext.tsx` montre uniquement des imports modifiés.

### Prochaine phase logique

Après Lot F → Lot G (step 2.3, Subject api.ts). Puis Lot H (2.4, SubjectContext migration — **smoke obligatoire**). Voir §5b pour le plan complet Phase 2.

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

### Critères de succès Phase 2

- [ ] `entities/subject/` et `entities/strategy/` existent avec `types.ts`, `model.ts`, `api.ts` (subject only), `hooks.ts` + `__tests__/`
- [ ] `SubjectContext.tsx` ne contient plus aucun `supabase.from(...)` direct — tout passe par `api.ts`
- [ ] `StrategyContext.tsx` utilise `isValidStrategy` de `entities/strategy/model.ts`
- [ ] `src/types/strategy.ts` supprimé
- [ ] 12 + 5 + 7 = **24 imports migrés** vers les couches entities
- [ ] `npm test` passe de 39 → ~50 tests
- [ ] Tag `phase-2-done` posé
- [ ] Smoke tests user passés (après Lot H et après Lot K)

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
