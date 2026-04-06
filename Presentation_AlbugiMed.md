# Présentation Fonctionnelle et Structurale de l'Application AlbugiMed

## Introduction
AlbugiMed est une application spécialisée, conçue pour l'accompagnement complet, la planification stratégique, et l'entraînement intensif des étudiants en médecine - particulièrement orientée vers la préparation aux EDN (Épreuves Dématérialisées Nationales). Elle agit comme un tableau de bord global de l'apprentissage (projet fonctionnant sous le prisme "Med-Pilot OS").

L'application repose sur quatre piliers principaux (Vues/Pages) et de nombreux modules sous-jacents interagissant pour assurer le suivi, l'agenda et la progression globale de l'étudiant. Cette présentation détaille l'approche de façon exhaustive et purement systémique.

---

## 1. Le Tableau de Bord (HomeView)
**Objectif** : Fournir une vue synthétique instantanée de la progression, de l'état du jour, des tâches à accomplir et des échéances critiques.

**Modules Intégrés** :
- **Compte à rebours EDN** : Affiche en permanence les jours restants jusqu'au concours national, encadrant chronologiquement le focus de l'étudiant.
- **Barre de Statistiques (StatsBar)** : Jauge de progression. Elle croise le nombre total de chapitres du cursus étudiés en fonction de trois jalons spécifiques (Tour 1, Annales, Tour 2) et en extrait un pourcentage d'avancement holistique, visible en temps réel.
- **Alertes et Échéances (Inline Alerts / Upcoming Deadlines)** : Met en surbrillance automatique les échéances critiques imminentes (notamment dans les 48 heures pré-échéance) issues de l'agenda, des sessions préparatoires, ou spécifiques à la stratégie d'apprentissage propre au cursus.
- **Planificateur de Session Quotidien (Session Widget)** : Algorithme (Suggestion Engine) qui propose un programme de travail quotidien structuré ("Daily Dose"). Il impose l'ordre de révision des chapitres et s'appuie sur des quotas journaliers de sessions pour maintenir un rythme soutenu et maîtrisé.
- **Suivi Hebdomadaire (Weekly Tracker)** : Module de traçage du temps ou de l'assiduité d'étude loguée sous forme de carte thermique ou d'indicateurs visuels s'étalant sur les 7 derniers jours.
- **Tâches & Notes Rapides (TasksNotes)** : Espace pour la saisie sans frottement ("quick-input") de notes à la volée, d'introspections ou d'une liste de choses à faire.
- **Registre des Dernières Erreurs (Recent Errors)** : Historique extracteur listant brièvement les récentes fautes commises au cours de l'entraînement (DP, examens blancs) pour garantir un apprentissage "par l'erreur".

---

## 2. L'Agenda et la Planification (PlanningView)
**Objectif** : Unifier le pilotage temporel global de l'étudiant. Gérer ses examens partiels, ses temps de vie et ses fenêtres de révision grâce à un calendrier dynamique.

**Modules Intégrés** :
- **Gestionnaire d'Agenda centralisé** : Mécanisme permettant la création, l'édition, la synchronisation et la suppression d'évènements, de rendez-vous ou d'échéances académiques de façon récurrente ou ponctuelle.
- **Planification Stratégique & Examen** : Module où sont paramétrés les délais cibles ("Strategy Deadlines"). Cela permet à l'algorithme d'avoir des bornes visuelles et temporelles pour évaluer le retard et configurer le "Tableau de Bord".

---

## 3. Entraînement et Simulation (SimulationView)
**Objectif** : Interface d'exercice pratique par le questionnement progressif (Les DP ou Dossiers Progressifs de médecine) dans un environnement dénué de distractions.

**Modules Intégrés** :
- **Environnement d'Évaluation (Moteur d'Exercice)** : Interface épurée testant les connaissances brutes et cliniques.
- **Mécanisme de Correction et de Persistance** : Algorithme de redressement qui traite les cas cliniques, valide le niveau de l'étudiant, marque les erreurs, et met à jour instantanément la base de données. C'est l'organe technique qui nourrit le "Registre des Dernières Erreurs" et qualifie le niveau global.

---

## 4. Gestion des Matières et du Programme (SubjectsView)
**Objectif** : Cartographier techniquement la division de la connaissance médicale, matière par matière, pour un suivi très granulaire (arbre structurel du savoir).

**Modules Intégrés** :
- **Arborescence du Programme** : Répertoire complet des matières de spécialité (Cardio, Neuro, etc.) qui contiennent elles-mêmes des items/chapitres.
- **Balisage Multi-Niveaux (Statut des Chapitres)** : Mécanisme structurel où, pour chaque chapitre, l'étudiant valide les 3 jalons fondamentaux consécutifs (Tour 1, Annales, Tour 2).
- L'achèvement total ou partiel de cette matrice logicielle propulse directement la statistique de réussite observée dans le Tableau de Bord principal.

---

## 5. Architecture Transversale et Gestion des Données
**Objectif** : Assurer l'intégrité, la gestion fonctionnelle asynchrone, et la portabilité des données de manière robuste.

- **Portabilité et Sécurité des Données (Supabase & Context)** : L'application traite localement une grande charge de données personnelles et médicales par les React Context. Un système d'exportation/importation connecté au Cloud (Supabase) garantit des sessions sécurisées, et prévient la perte des logs d'apprentissage en autorisant une migration fluide entre appareils.
- **Interactions NLP / Moteurs Logiques** : Le code dispose de fonctionnalités permettant de disséquer sémantiquement les retours, la nature des évènements créés ou les scores afin de guider le pilotage du logiciel, offrant une dimension OS (Operating System) au projet complet.

---

## Conclusion
AlbugiMed est une application technique cartésienne agissant comme un "cerveau déporté". Elle regroupe la taxonomie de connaissance (Programme), la métrique temporelle (Agenda) et l'exercice clinique (Simulation) sous un système de pilotage de haut niveau qui dicte avec rigueur la marche à suivre journalière de l'étudiant en quête de performance.
