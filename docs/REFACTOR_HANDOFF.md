# AlbugiMed — Refactor Handoff (état courant)

> **État réel du refactor.** Document vivant, mis à jour après chaque lot d'étapes validé. Couplé à `REFACTOR_PLAN.md` qui est la référence figée.

**Dernière mise à jour** : 2026-04-18
**Mise à jour par** : Claude (session interactive)

---

## 1. Snapshot git

| Champ | Valeur |
|---|---|
| Branche courante | `refactor/architecture-v2` |
| Base | `main` |
| Tag de rollback | `backup/pre-refactor-v2` (HEAD pristine de `main` avant tout refactor) |
| HEAD de la branche refactor | `00bf415` (voir `git log --oneline -20`) |
| Remote push | **non pushé** — tout est local |
| Tests | 6 fichiers / 39 tests / 0 échec |
| Build Next.js | ✅ OK (6 routes statiques, middleware 79.6 kB) |

### Commits sur la branche refactor (du plus récent au plus ancien)

```
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
| 1.14 suppression conditionnelle `useCloudStorage.ts` | ⚠️ reportée | **Suppression non effectuée** : 2 consommateurs restants (`ErrorPanel.tsx`, `AnkiExport.tsx`, clé `med-pilot-error-bank`) — leur migration est planifiée en Phase 7 (étapes 7.9 et 7.10). Prompt du plan 1.14 prévoit ce cas. Build + tests OK, fichier `src/hooks/useCloudStorage.ts` conservé tel quel. |

### Phases 2 à 8

**Non commencées.** Voir `REFACTOR_PLAN.md` pour le détail.

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

## 4. Prochain lot à exécuter — **Phase 1 terminée côté Phase 1, passage à Phase 2**

Phase 1 est **terminée en ce qui concerne ses 13 premières étapes validées** (1.1 → 1.13). L'étape 1.14 (suppression de `useCloudStorage.ts`) est **reportée à après Phase 7** (quand ErrorPanel + AnkiExport auront été migrés en étapes 7.9 et 7.10).

### Smoke test Lots C + D (encore à faire manuellement par le user)

Validé programmatiquement : build + 39 tests + dev server boot + page login 200 + middleware OK + 0 erreur/warning dans logs dev. **Non validé automatiquement** (nécessite session Supabase authentifiée) :
- Planning : créer événement one-off, slot récurrent, deadline → refresh → persistance OK
- Strategy : modifier puis refresh → persistance OK
- Agenda (`EventContext`) : créer un event → refresh → persistance OK
- Home : modifier date EDN, créer task, écrire note → refresh → persistance OK
- Session timing : démarrer puis compléter une session → vérifier `WeeklyTracker` et `med-pilot-session-timing` en Supabase

### Prochaine phase logique

Voir `REFACTOR_PLAN.md` §5 Phase 2 : découpage en entities + migration des gros contexts (`SubjectContext`, `SessionEngineContext`). Préalable : discussion avec le user pour cadrer Phase 2 (périmètre et découpage en lots).

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

**À la fin de Phase 1** : tag `phase-1-done`, smoke test complet selon `REFACTOR_PLAN.md` §9.

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
