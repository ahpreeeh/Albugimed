# AlbugiMed — Refactor Handoff (état courant)

> **État réel du refactor.** Document vivant, mis à jour après chaque lot d'étapes validé. Couplé à `REFACTOR_PLAN.md` qui est la référence figée.

**Dernière mise à jour** : 2026-04-15
**Mise à jour par** : Claude (session interactive)

---

## 1. Snapshot git

| Champ | Valeur |
|---|---|
| Branche courante | `refactor/architecture-v2` |
| Base | `main` |
| Tag de rollback | `backup/pre-refactor-v2` (HEAD pristine de `main` avant tout refactor) |
| HEAD de la branche refactor | `3355c67` (voir `git log --oneline -5`) |
| Remote push | **non pushé** — tout est local |
| Tests | 4 fichiers / 32 tests / 0 échec |
| Build Next.js | ✅ OK (6 routes statiques, middleware 79.6 kB) |

### Commits sur la branche refactor (du plus récent au plus ancien)

```
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

**Non commencée.**

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

## 4. Prochain lot à exécuter — **Lot A (étapes 1.1 → 1.2)**

Le user a imposé un découpage par lots courts avec stop/rapport entre chaque lot. Voir §5 pour la séquence complète de Phase 1.

### Lot A — 2 étapes, aucune UI modifiée, risque global faible

#### Étape 1.1 — Créer `src/shared/config/storageKeys.ts`

- **Objectif** : centraliser toutes les clés de stockage en constantes typées
- **Fichiers** : CRÉE `src/shared/config/storageKeys.ts`
- **Source des clés** : `src/hooks/useMigration.ts` lignes 19-43 (constante `KNOWN_KEYS` existante — 14 clés)
- **Prompt** (copiable tel quel) :
  > Crée le fichier `src/shared/config/storageKeys.ts` qui exporte une constante `STORAGE_KEYS as const` contenant toutes les clés listées dans `KNOWN_KEYS` de `src/hooks/useMigration.ts` lignes 19-43. Structure-les par domaine (subjects, strategy, session, simulation, events, planning, home, chat). Ajoute un type `StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]`. Ne modifie AUCUN autre fichier — c'est juste une création. Vérifie que le fichier compile avec `npm run build`.
- **Valide** : `npm run build` compile sans erreur
- **Commit** : `refactor(phase-1): step 1.1 — add shared/config/storageKeys.ts`
- **Risque** : nul (création pure, aucun consommateur)
- **Reversible** : oui

#### Étape 1.2 — Créer `src/shared/api/userDataRepository.ts` + tests

- **Objectif** : façade générique sur la table Supabase `user_data`, testable et testée
- **Dépend** : 1.1
- **Fichiers** : CRÉE `src/shared/api/userDataRepository.ts` + `src/shared/api/__tests__/userDataRepository.test.ts`
- **Prompt** (copiable tel quel) :
  > Crée `src/shared/api/userDataRepository.ts` qui exporte un objet `userDataRepository` avec 4 méthodes : `get<T>(key: string): Promise<T | null>`, `set<T>(key: string, value: T): Promise<void>`, `remove(key: string): Promise<void>`, `batchGet(keys: string[]): Promise<Record<string, unknown>>`. L'implémentation utilise `createClient` de `src/utils/supabase/client`. Si pas d'user connecté, `get` retourne `null` et `set`/`remove` retournent silencieusement (fire-and-forget). Toutes les erreurs Supabase sont loggées en `console.warn` avec le préfixe `[userDataRepository]` mais ne throw pas. Crée aussi `src/shared/api/__tests__/userDataRepository.test.ts` avec vitest qui mock `@/utils/supabase/client` et teste : `get` sans user → `null`, `set` puis `get` → deep-equal, `remove` après `set` → `null`, `batchGet` avec 3 clés dont 1 absente → objet avec 2 entrées. Ne modifier aucun consommateur existant.
- **Valide** : `npm test -- userDataRepository` → tous les tests passent ; `npm run build` compile
- **Commit** : `refactor(phase-1): step 1.2 — add userDataRepository facade + tests`
- **Risque** : faible (code neuf, non branché à aucun consommateur)
- **Reversible** : oui

### Après le Lot A → STOP

Rapport attendu au user avec :
- Les 2 nouveaux fichiers créés + leurs tailles
- Les 2 commits hash + messages
- Résultat de `npm run build` et `npm test`
- Éventuelles surprises (aucune clé manquante dans `KNOWN_KEYS` par ex.)

Puis attendre le feu vert pour le Lot B.

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
