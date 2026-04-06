const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 60, right: 60 },
  info: {
    Title: 'AlbugiMed — Documentation fonctionnelle',
    Author: 'AlbugiMed',
    Subject: 'Présentation des modules et fonctionnalités',
  }
});

const output = fs.createWriteStream('D:/AlbugiMed/Presentation_AlbugiMed.pdf');
doc.pipe(output);

// ── Palette ────────────────────────────────────────────────────────────
const C = {
  accent:   '#6366f1',
  dark:     '#0f172a',
  mid:      '#334155',
  light:    '#64748b',
  muted:    '#94a3b8',
  bg:       '#f8fafc',
  border:   '#e2e8f0',
  white:    '#ffffff',
  red:      '#ef4444',
  green:    '#22c55e',
};

const W = 595 - 120; // page width minus margins

// ── Helpers ────────────────────────────────────────────────────────────

function header(title, subtitle) {
  // Cover bar
  doc.rect(60, doc.y, W, 2).fill(C.accent);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(C.dark).text(title, 60);
  if (subtitle) {
    doc.font('Helvetica').fontSize(10).fillColor(C.light).text(subtitle, 60);
  }
  doc.moveDown(0.6);
}

function sectionTitle(text) {
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.accent).text(text.toUpperCase(), 60, doc.y, { characterSpacing: 0.5 });
  doc.rect(60, doc.y + 2, W, 0.5).fill(C.border);
  doc.moveDown(0.5);
}

function body(text, options = {}) {
  doc.font('Helvetica').fontSize(9.5).fillColor(C.mid).text(text, 60, doc.y, { width: W, lineGap: 3, ...options });
  doc.moveDown(0.3);
}

function label(key, value) {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.dark).text(key + ' ', 60, y, { continued: true });
  doc.font('Helvetica').fontSize(9).fillColor(C.mid).text(value, { lineGap: 2 });
  doc.moveDown(0.2);
}

function bullet(text, indent = 75) {
  const y = doc.y;
  doc.font('Helvetica').fontSize(9).fillColor(C.accent).text('•', 60, y, { continued: true, width: 12 });
  doc.font('Helvetica').fontSize(9).fillColor(C.mid).text(' ' + text, indent, y, { width: W - (indent - 60), lineGap: 2 });
  doc.moveDown(0.15);
}

function subBullet(text) {
  const y = doc.y;
  doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text('–', 80, y, { continued: true, width: 12 });
  doc.font('Helvetica').fontSize(8.5).fillColor(C.light).text(' ' + text, 92, y, { width: W - 32, lineGap: 2 });
  doc.moveDown(0.1);
}

function chip(text, color = C.accent) {
  const w = doc.widthOfString(text) + 12;
  const h = 14;
  const x = 60;
  const y = doc.y;
  doc.roundedRect(x, y, w, h, 3).fill(color + '22');
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(color).text(text, x + 6, y + 3, { width: w });
  doc.moveDown(1.2);
}

function newPage(title) {
  doc.addPage();
  // Page header strip
  doc.rect(0, 0, 595, 6).fill(C.accent);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted)
     .text('ALBUGIMED — DOCUMENTATION FONCTIONNELLE', 60, 20, { align: 'left', continued: true })
     .text(title.toUpperCase(), 60, 20, { align: 'right' });
  doc.moveDown(2);
}

function infoBox(text) {
  const y = doc.y;
  const h = 28;
  doc.rect(60, y, W, h).fill('#f1f5f9');
  doc.font('Helvetica').fontSize(8.5).fillColor(C.light)
     .text(text, 68, y + 8, { width: W - 16, lineGap: 2 });
  doc.moveDown(2);
}

// ══════════════════════════════════════════════════════════════════════
// PAGE 1 — COUVERTURE
// ══════════════════════════════════════════════════════════════════════

doc.rect(0, 0, 595, 842).fill(C.dark);
doc.rect(0, 0, 595, 8).fill(C.accent);
doc.rect(0, 834, 595, 8).fill(C.accent);

// Logo area
doc.roundedRect(60, 120, 56, 56, 12).fill(C.accent);
doc.font('Helvetica-Bold').fontSize(28).fillColor(C.white).text('+', 73, 132);

// Title
doc.font('Helvetica-Bold').fontSize(40).fillColor(C.white).text('AlbugiMed', 60, 200);
doc.font('Helvetica').fontSize(16).fillColor(C.muted).text('Système de révision médicale EDN', 60, 250);

// Separator
doc.rect(60, 285, 80, 2).fill(C.accent);

// Description
doc.font('Helvetica').fontSize(11).fillColor('#94a3b8')
   .text('Documentation fonctionnelle — présentation exhaustive\ndes modules, pages et fonctionnalités de l\'application.', 60, 305, { width: 400, lineGap: 6 });

// Metadata block
doc.rect(60, 640, W, 80).fill('#1e293b');
doc.font('Helvetica-Bold').fontSize(9).fillColor(C.muted).text('PLATEFORME', 72, 655);
doc.font('Helvetica').fontSize(9).fillColor(C.white).text('Web — Next.js 14, React 18, TypeScript 5, Supabase', 72, 667);

doc.font('Helvetica-Bold').fontSize(9).fillColor(C.muted).text('CIBLE', 72, 685);
doc.font('Helvetica').fontSize(9).fillColor(C.white).text('Étudiants en médecine préparant l\'EDN (Examen Dématérialisé National)', 72, 697);

doc.font('Helvetica').fontSize(8).fillColor(C.muted).text('Version 0.1.0 — 2026', 60, 800, { align: 'center', width: W });

// ══════════════════════════════════════════════════════════════════════
// PAGE 2 — TABLE DES MATIÈRES
// ══════════════════════════════════════════════════════════════════════

newPage('Sommaire');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').fontSize(22).fillColor(C.dark).text('Table des matières', 60);
doc.moveDown(0.3);
doc.rect(60, doc.y, W, 1.5).fill(C.accent);
doc.moveDown(1);

const toc = [
  { num: '01', title: 'Vue d\'ensemble de l\'application', page: '03' },
  { num: '02', title: 'Architecture technique', page: '04' },
  { num: '03', title: 'Page Cockpit (Aujourd\'hui)', page: '05' },
  { num: '04', title: 'Module Session quotidienne', page: '06' },
  { num: '05', title: 'Module Suivi hebdomadaire', page: '07' },
  { num: '06', title: 'Page Matières', page: '08' },
  { num: '07', title: 'Page Simulation (DP)', page: '09' },
  { num: '08', title: 'Module Simulateur IA (chat)', page: '10' },
  { num: '09', title: 'Module Cahier d\'erreurs', page: '11' },
  { num: '10', title: 'Module Export Anki', page: '12' },
  { num: '11', title: 'Page Planning', page: '13' },
  { num: '12', title: 'Module Stratégie', page: '14' },
  { num: '13', title: 'Paramètres et données', page: '15' },
  { num: '14', title: 'Synchronisation et stockage', page: '16' },
  { num: '15', title: 'Note d\'architecture — problèmes connus', page: '17' },
];

toc.forEach((item, i) => {
  const y = doc.y;
  const isEven = i % 2 === 0;
  if (isEven) doc.rect(60, y - 3, W, 18).fill('#f8fafc');
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.accent).text(item.num, 65, y + 1, { continued: true, width: 25 });
  doc.font('Helvetica').fontSize(9).fillColor(C.dark).text(item.title, 92, y + 1, { continued: true, width: W - 60 });
  doc.font('Helvetica').fontSize(9).fillColor(C.muted).text(item.page, 60, y + 1, { align: 'right', width: W });
  doc.moveDown(1.0);
});

// ══════════════════════════════════════════════════════════════════════
// PAGE 3 — VUE D'ENSEMBLE
// ══════════════════════════════════════════════════════════════════════

newPage('Vue d\'ensemble');
header('01 — Vue d\'ensemble', 'Présentation générale de l\'application AlbugiMed');

body('AlbugiMed est une application web de révision médicale destinée aux étudiants en médecine préparant l\'EDN (Examen Dématérialisé National). Elle centralise la gestion des matières, le suivi de révision, la simulation de cas cliniques par IA, et la planification des sessions de travail.');

sectionTitle('Objectif');
body('Fournir un outil structuré permettant à un étudiant en médecine de :\n— Organiser ses matières et chapitres selon les programmes EDN\n— Suivre sa progression chapitre par chapitre (3 niveaux de validation)\n— Générer des sessions de travail quotidiennes adaptées à sa stratégie\n— Simuler des dossiers progressifs avec correction IA\n— Planifier ses créneaux de révision dans un agenda\n— Synchroniser ses données entre appareils via son compte');

sectionTitle('Navigation principale');
body('L\'application comporte 5 onglets dans la barre de navigation supérieure :');
bullet("Aujourd'hui — tableau de bord avec session du jour et activité hebdomadaire");
bullet('Matières — gestion des matières et suivi des chapitres');
bullet('Simulation — simulateur IA de dossiers progressifs (DP)');
bullet('Planning — agenda et créneaux récurrents');
bullet('À venir — espace réservé pour fonctionnalités futures');

sectionTitle('Accès et compte');
body('L\'application nécessite un compte utilisateur (authentification Supabase). Sans connexion, les fonctionnalités IA sont désactivées et les données restent locales. Avec connexion, toutes les données sont synchronisées dans le cloud et accessibles sur tout appareil.');

// ══════════════════════════════════════════════════════════════════════
// PAGE 4 — ARCHITECTURE TECHNIQUE
// ══════════════════════════════════════════════════════════════════════

newPage('Architecture technique');
header('02 — Architecture technique', 'Stack et structure des données');

sectionTitle('Stack technologique');
label('Frontend :', 'Next.js 14.2 (App Router) — React 18 — TypeScript 5 — Tailwind CSS 3.4');
label('Backend :', 'Supabase (Auth + PostgreSQL + RLS)');
label('IA :', 'Google Gemini API (gemini-2.5-flash par défaut)');
label('NLP :', 'chrono-node 2.9 (parsing de dates en français)');
label('Rendu :', 'react-markdown (affichage des réponses IA)');

sectionTitle('Structure de stockage');
body('Deux couches de persistance fonctionnent en parallèle :');
bullet('localStorage (navigateur) — cache local pour un démarrage instantané. Lecture à froid, mise à jour à chaque écriture.');
bullet('Supabase user_data — source de vérité. Table clé-valeur JSONB par utilisateur, avec RLS (Row Level Security). Mise à jour asynchrone en arrière-plan.');
body('Règle : au montage d\'une page, l\'état s\'initialise depuis le localStorage (0 ms), puis Supabase est interrogé et remplace les données si une version cloud existe.');

sectionTitle('Table Supabase : user_data');
infoBox('Colonnes : user_id (UUID, FK vers auth.users) | data_key (text) | data_value (jsonb) | updated_at (timestamptz). Clé primaire : (user_id, data_key). RLS : lecture et écriture limitées au user_id de la session.');

sectionTitle('Clés de stockage principales');
const keys = [
  ['med-pilot-subjects-v4', 'Liste complète des matières et chapitres'],
  ['med-pilot-active-strategy', 'Stratégie de révision active'],
  ['med-pilot-events', 'Événements agenda'],
  ['med-pilot-error-bank', 'Cahier d\'erreurs de simulation'],
  ['med-pilot-quick-tasks', 'Tâches rapides (page d\'accueil)'],
  ['med-pilot-quick-notes', 'Notes rapides (page d\'accueil)'],
  ['med-pilot-edn-date', 'Date de l\'examen EDN configurée'],
  ['med-pilot-session-history', 'Historique des sessions de travail'],
  ['albugi-planning-slots', 'Créneaux récurrents du planning'],
  ['med-pilot-gemini-key', 'Clé API Gemini (Supabase uniquement, jamais localStorage)'],
];
keys.forEach(([k, v]) => {
  doc.font('Courier').fontSize(7.5).fillColor(C.accent).text(k, 60, doc.y, { continued: true, width: 230 });
  doc.font('Helvetica').fontSize(8).fillColor(C.mid).text('  ' + v, { lineGap: 2 });
  doc.moveDown(0.1);
});

sectionTitle('Gestion d\'état (React Contexts)');
body('7 contextes React partagent l\'état global entre composants :');
['SubjectContext — matières et chapitres',
 'SessionEngineContext — session quotidienne et historique',
 'StrategyContext — stratégie de révision active',
 'EventContext — événements agenda',
 'PlanningContext — créneaux récurrents et deadlines',
 'ThemeContext — thème visuel',
 'ViewContext — onglet actif'
].forEach(c => bullet(c));

// ══════════════════════════════════════════════════════════════════════
// PAGE 5 — COCKPIT
// ══════════════════════════════════════════════════════════════════════

newPage('Page Cockpit');
header("03 — Page Cockpit (Aujourd'hui)", "Tableau de bord principal");

body("Le Cockpit est la page d'accueil de l'application. Elle agrège en un seul écran les informations essentielles de la journée et de la semaine, sans nécessiter de navigation entre plusieurs pages.");

sectionTitle('Structure visuelle');
body('La page est organisée en deux colonnes sur grand écran (une colonne sur mobile) :');
bullet('Colonne gauche (2/3) : session du jour + traceur hebdomadaire');
bullet('Colonne droite (1/3) : deadlines, tâches, notes, erreurs récentes, actions rapides');

sectionTitle('Composants présents');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Compte à rebours EDN', 60);
doc.moveDown(0.2);
body('Affiche le nombre de jours restants avant l\'examen EDN. La date est configurable par l\'utilisateur. Disparaît automatiquement si la date est passée.');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Barre de stats globale', 60);
doc.moveDown(0.2);
body('Affiche 3 métriques calculées en temps réel depuis les matières : nombre de matières, chapitres complétés (flag t2 coché), pourcentage d\'avancement global.');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Alertes 48h', 60);
doc.moveDown(0.2);
body('Bandeau d\'alerte qui liste automatiquement les événements imminents (dans les 48 prochaines heures) issus de l\'agenda, des deadlines de planning, et des dates d\'examen par matière.');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Deadlines (60 jours)', 60);
doc.moveDown(0.2);
body('Liste dans la colonne droite les échéances à venir sur 60 jours : examens par matière, deadlines de strategy, et événements agenda. Triées par date, codées par type.');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Tâches rapides & Notes', 60);
doc.moveDown(0.2);
body('Deux onglets dans la colonne droite. Tâches : liste de to-do avec cases à cocher et suppression. Notes : zone de texte libre. Les deux sont synchronisés dans Supabase.');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Erreurs récentes', 60);
doc.moveDown(0.2);
body('Affiche les 5 dernières erreurs capturées lors des simulations DP. Lien rapide vers la page Simulation pour consulter le cahier complet.');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Actions rapides', 60);
doc.moveDown(0.2);
body('4 boutons de navigation rapide vers les principales sections : Matières, Simulation, Planning, Stratégie.');

// ══════════════════════════════════════════════════════════════════════
// PAGE 6 — SESSION QUOTIDIENNE
// ══════════════════════════════════════════════════════════════════════

newPage('Module Session quotidienne');
header('04 — Module Session quotidienne', 'Planification et exécution des tâches du jour');

body('Le SessionWidget est le module central de la page Cockpit. Il génère automatiquement une liste de tâches médicales pour la journée en fonction de la stratégie configurée et de l\'avancement par chapitre.');

sectionTitle('États du module');
bullet('Pas de stratégie configurée → invitation à définir une stratégie');
bullet('Stratégie active, pas de session → sélecteur de charge (Plancher / Standard / Plafond)');
bullet('Session en cours → affichage de la tâche courante et de la file d\'attente');
bullet('Session terminée → résumé avec temps total');

sectionTitle('Niveaux de charge (Day Load)');
label('Plancher :', '1 nouveau chapitre (+ 1 entretien si disponible) — journée chargée');
label('Standard :', '1 nouveau + 1 entretien + 1 révision — charge normale');
label('Plafond :', '1 à 3 nouveaux + 1 entretien + 1 révision — journée intensive');

sectionTitle('Types de tâches générées');
bullet('cours — lecture du cours pour un nouveau chapitre');
bullet('annale N1/N2/N3/N4 — annales à niveau progressif (N1 = débutant, N4 = EDN réaliste)');

sectionTitle('Catégorisation des chapitres');
body('L\'algorithme classe chaque chapitre selon son état de progression :');
bullet('Nouveau — cours non commencé, pas de level1Done');
bullet('Entretien — cours commencé mais advancedDone non atteint');
bullet('Révision — chapitre complété, révision de maintien');

sectionTitle('Exécution d\'une tâche');
body('Pour chaque tâche, l\'étudiant dispose de :');
bullet('Bouton Démarrer → lance le chronomètre de la tâche');
bullet('Bouton Pause / Reprendre → suspension du temps');
bullet('Bouton Arrêter → déclenche l\'évaluation de difficulté (4 niveaux : Facile / Moyen / Difficile / Très difficile)');
bullet('Bouton Passer → ignore la tâche sans notation');
body('À la fin de chaque tâche, la difficulté est enregistrée et influence la priorité future du chapitre. Le temps de travail est loggé pour le suivi hebdomadaire.');

// ══════════════════════════════════════════════════════════════════════
// PAGE 7 — SUIVI HEBDOMADAIRE
// ══════════════════════════════════════════════════════════════════════

newPage('Module Suivi hebdomadaire');
header('05 — Module Suivi hebdomadaire', 'WeeklyTracker — activité sur 7 jours');

body('Le WeeklyTracker est affiché sous le SessionWidget dans le Cockpit. Il visualise l\'activité de révision sur la semaine courante et la compare aux objectifs définis par la stratégie.');

sectionTitle('Affichage');
bullet('Grille de 7 colonnes (Lun → Dim) avec navigation semaine précédente / suivante');
bullet('Pour chaque jour : nom, date, heures loggées, barre de progression relative');
bullet('Le jour actuel est marqué visuellement (point coloré)');
bullet('Mise à jour automatique toutes les 5 secondes (synchronisation avec la session active)');

sectionTitle('Statistiques du bas de page');
label('Total :', 'Heures travaillées sur la semaine');
label('Objectif :', 'Chapitres à traiter calculés depuis la stratégie (deadline × charge quotidienne)');
label('Accompli :', 'Chapitres effectivement validés cette semaine');
label('Taux :', 'Pourcentage d\'accomplissement affiché sous forme de badge circulaire');

sectionTitle('Calcul de l\'objectif');
body('L\'objectif hebdomadaire est calculé depuis la stratégie active : si une date d\'examen est définie, le nombre de jours restants et le nombre de chapitres non traités permettent de calculer un rythme quotidien minimum. Ce rythme est multiplié par 7 pour obtenir l\'objectif de la semaine.');

sectionTitle('Données sources');
body('Les données proviennent de deux sources :');
bullet('med-pilot-session-timing : timestamps de début/fin de chaque tâche effectuée');
bullet('SubjectContext : liste des chapitres et leurs flags de progression pour calculer les "accomplis"');

// ══════════════════════════════════════════════════════════════════════
// PAGE 8 — MATIÈRES
// ══════════════════════════════════════════════════════════════════════

newPage('Page Matières');
header('06 — Page Matières', 'Gestion des matières et suivi des chapitres');

body('La page Matières est l\'espace de gestion de la bibliothèque de révision. Elle permet d\'organiser les matières médicales par année et semestre, de lister les chapitres, et de suivre l\'avancement sur 3 niveaux de validation.');

sectionTitle('Organisation hiérarchique');
body('Les matières sont regroupées selon trois niveaux :');
bullet('Année (ex: 3ème année, 4ème année)');
subBullet('Semestre');
subBullet('  → Matière → Chapitres');
body('Les matières sans année/semestre sont regroupées dans une section "Non classé". Chaque niveau est repliable/dépliable.');

sectionTitle('Filtres disponibles');
bullet('Toutes — liste complète');
bullet('Non commencées — aucun chapitre avec t1 validé');
bullet('En cours — progression partielle');
bullet('Examen proche — date d\'examen dans les 30 prochains jours');

sectionTitle('Fiche matière');
body('Chaque matière est affichée sous forme de carte contenant :');
bullet('Icône médicale, nom de la matière');
bullet('Nombre de chapitres total et barre de progression');
bullet('Date d\'examen (si configurée)');
bullet('Clic → ouvre la vue détail de la matière');

sectionTitle('Vue détail d\'une matière');
body('En cliquant sur une matière, un modal s\'ouvre avec :');
bullet('Liste de tous les chapitres avec 3 checkboxes par chapitre :');
subBullet('T1 — cours terminé');
subBullet('Annales — annales traitées');
subBullet('T2 — révision terminée');
bullet('Actions : ajouter un chapitre, renommer, supprimer, import en masse');
bullet('Chaque modification est immédiatement persistée (localStorage + Supabase)');

sectionTitle('Ajout de matière');
body('Un bouton "Nouvelle matière" ouvre un formulaire : nom, icône médicale, année, semestre, date d\'examen. Les chapitres peuvent être ajoutés individuellement ou en masse (coller une liste).');

// ══════════════════════════════════════════════════════════════════════
// PAGE 9 — SIMULATION
// ══════════════════════════════════════════════════════════════════════

newPage('Page Simulation');
header('07 — Page Simulation (DP)', 'Simulateur de dossiers progressifs médicaux');

body('La page Simulation est le module de pratique active. Elle permet à l\'étudiant de s\'entraîner sur des dossiers progressifs (DP) générés par IA, de consulter et gérer son cahier d\'erreurs, et d\'exporter ses erreurs sous forme de flashcards Anki.');

sectionTitle('Organisation de la page');
body('La page est divisée en deux zones sur grand écran :');
bullet('Zone gauche (principale) : le simulateur de chat IA');
bullet('Zone droite (sidebar) : le cahier d\'erreurs en temps réel');
body('Sur mobile, seul le simulateur est affiché. Le cahier d\'erreurs est accessible via l\'icône dans l\'en-tête du simulateur.');
body('Lorsque l\'export Anki est déclenché, il remplace temporairement toute la vue.');

sectionTitle('Flux d\'utilisation typique');
bullet('1. Configurer la clé API Gemini dans le panneau de configuration du chat');
bullet('2. Démarrer un nouveau DP ou continuer une session');
bullet('3. Répondre aux questions posées par l\'IA étape par étape');
bullet('4. L\'IA corrige, argumente, et capture automatiquement les erreurs');
bullet('5. Consulter le cahier d\'erreurs mis à jour en temps réel');
bullet('6. Exporter les erreurs en flashcards Anki CSV');

// ══════════════════════════════════════════════════════════════════════
// PAGE 10 — SIMULATEUR IA
// ══════════════════════════════════════════════════════════════════════

newPage('Module Simulateur IA');
header('08 — Module Simulateur IA (chat)', 'SimulatorChat — interface de simulation DP');

body('Le SimulatorChat est l\'interface conversationnelle avec le modèle Gemini. Il simule un examinateur médical qui pose des questions cliniques progressives, corrige les réponses, et capture les erreurs commises.');

sectionTitle('Configuration');
bullet('Clé API Gemini : saisie dans le panneau de configuration, stockée uniquement dans Supabase (jamais dans le navigateur)');
bullet('Modèle : configurable (défaut : gemini-2.5-flash)');
bullet('Si l\'utilisateur n\'est pas connecté : IA désactivée, message de verrouillage affiché');

sectionTitle('Protocole IA (system prompt)');
body('Le modèle reçoit un prompt système strict définissant son comportement :');
bullet('Séquentiel verrouillé : l\'IA ne dévoile jamais la suite avant la réponse de l\'étudiant');
bullet('5 niveaux de difficulté (0 = typique EDN, 4 = EDN réaliste avec pièges)');
bullet('Structure : introduction clinique → 3-6 étapes → 2-4 questions → correction argumentée → débrief final');
bullet('Notation de gravité des erreurs : Mineur / Majeur / Éliminatoire');

sectionTitle('Capture automatique d\'erreurs');
body('Lorsque l\'IA détecte une erreur dans la réponse de l\'étudiant, elle insère dans sa réponse un bloc structuré JSON entre balises [CAPTURE_ERREUR]...[/CAPTURE_ERREUR]. Le simulateur extrait automatiquement ces blocs, les déduplique par matière + question, et les ajoute au cahier d\'erreurs. Les balises sont retirées du texte affiché.');

sectionTitle('Fonctionnalités de l\'interface');
bullet('Rendu Markdown des réponses IA (tableaux, gras, listes)');
bullet('Historique de session persisté (localStorage + Supabase)');
bullet('Détection d\'inactivité : nouvelle session si > 2h sans message');
bullet('Mode plein écran pour se concentrer sur le DP');
bullet('Bouton "Nouveau DP" pour réinitialiser la conversation');

sectionTitle('Gestion des erreurs réseau');
body('Messages d\'erreur spécifiques selon le code HTTP : clé invalide (401/403), modèle introuvable (404), quota dépassé (429), filtre de sécurité (SAFETY), erreur réseau.');

// ══════════════════════════════════════════════════════════════════════
// PAGE 11 — CAHIER D'ERREURS
// ══════════════════════════════════════════════════════════════════════

newPage("Module Cahier d'erreurs");
header("09 — Module Cahier d'erreurs", 'ErrorPanel — gestion des erreurs de simulation');

body("Le cahier d'erreurs centralise toutes les erreurs médicales commises lors des simulations DP. Il sert de référence de révision ciblée et de source pour la génération de flashcards Anki.");

sectionTitle('Structure d\'une erreur');
label('Matière :', 'Spécialité médicale concernée (ex: Cardiologie, Pneumologie...)');
label('Question :', 'Contexte clinique ou question posée lors du DP');
label('Erreur commise :', 'Réponse incorrecte ou omission de l\'étudiant');
label('Correction :', 'Réponse attendue avec justification');
label('Date :', 'Timestamp de capture');
label('Statut :', 'Non exporté / Exporté (marqué après export Anki)');

sectionTitle('Organisation');
body('Les erreurs sont groupées par matière avec affichage en accordéon (dépliable/repliable). Dans chaque groupe, les erreurs sont triées par date décroissante (plus récentes en premier).');

sectionTitle('Filtres');
bullet('Tout — affiche toutes les erreurs');
bullet('Nouveau — uniquement les erreurs non exportées vers Anki');
bullet('Exporté — erreurs déjà converties en flashcards');

sectionTitle('Actions disponibles');
bullet('Ajout manuel : formulaire avec 4 champs (matière, question, erreur, correction)');
bullet('Édition inline : modification directe dans la liste avec confirmation');
bullet('Suppression individuelle ou globale ("Tout effacer")');
bullet('Export Anki : déclenche le module AnkiExport');

sectionTitle('Synchronisation');
body("Le cahier d'erreurs est synchronisé dans Supabase. Les erreurs capturées automatiquement par le simulateur, les ajouts manuels, les modifications et suppressions sont tous persistés en cloud en temps réel.");

// ══════════════════════════════════════════════════════════════════════
// PAGE 12 — ANKI EXPORT
// ══════════════════════════════════════════════════════════════════════

newPage('Module Export Anki');
header('10 — Module Export Anki', 'Conversion des erreurs en flashcards');

body('Le module AnkiExport permet de transformer les erreurs du cahier en flashcards au format CSV compatible Anki. La conversion est assistée par IA (Gemini) qui reformule les erreurs en paires question/réponse pédagogiques.');

sectionTitle('Processus d\'export');
bullet('1. Affichage de la liste des erreurs avec cases à cocher');
bullet('2. Sélection des erreurs à convertir (bouton "Tout sélectionner" disponible)');
bullet('3. Clic "Générer (N)" → appel à l\'API Gemini avec les erreurs sélectionnées');
bullet('4. Aperçu des flashcards générées (paires Question / Réponse)');
bullet('5. Téléchargement du fichier CSV (séparateur ";")');
bullet('6. Les erreurs exportées sont marquées "isExported: true" dans le cahier');

sectionTitle('Format du fichier CSV');
body('Le fichier généré est directement importable dans Anki :');
bullet('En-tête : Question;Réponse');
bullet('Séparateur : point-virgule (;)');
bullet('Encodage : URI (compatible navigateur)');
bullet('Nom de fichier : anki_med_pilot_AAAA-MM-JJ.csv');

sectionTitle('Prompt IA de génération');
body('Le modèle reçoit les instructions suivantes pour la génération :');
bullet('Sortie : liste JSON strictement valide [{"question": "...", "reponse": "..."}]');
bullet('La question ne doit pas révéler la réponse');
bullet('La réponse doit être synthétique et factuelle (médecine ECN/EDN)');
bullet('Regroupement possible si plusieurs erreurs portent sur le même sujet');
bullet('Interdiction des caractères ";" (séparateur CSV)');

// ══════════════════════════════════════════════════════════════════════
// PAGE 13 — PLANNING
// ══════════════════════════════════════════════════════════════════════

newPage('Page Planning');
header('11 — Page Planning', 'Agenda et créneaux de révision');

body('La page Planning offre une vue complète de l\'organisation temporelle des révisions. Elle combine un agenda d\'événements ponctuels, des créneaux hebdomadaires récurrents, et une vue calendrier mensuelle.');

sectionTitle('3 modes d\'affichage');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Vue Semaine', 60);
doc.moveDown(0.2);
body('Grille horaire de 8h à 21h sur 7 jours (semaine en cours, navigation prev/next). Affiche les créneaux récurrents et les événements ponctuels superposés. Chaque entrée est colorée selon son type (Révision, Cours, Examen, Personnel). Navigation vers la semaine courante en un clic.');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Vue Créneaux récurrents', 60);
doc.moveDown(0.2);
body('Liste des blocs horaires hebdomadaires configurés. Chaque créneau définit : titre, type, jour(s) de la semaine, heure de début, durée. Possibilité d\'activer/désactiver temporairement un créneau, de modifier ou supprimer. Bouton "Nouveau créneau" pour ajouter.');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Vue Calendrier (mensuelle)', 60);
doc.moveDown(0.2);
body('Grille calendrier du mois en cours avec navigation mois précédent/suivant. Chaque case affiche les événements du jour (jusqu\'à 3 visibles + compteur). Clic sur un jour pour le sélectionner (surlignage). Panneau latéral listant tous les événements du mois.');

sectionTitle('Saisie naturelle d\'événements (NLP)');
body('Une barre de saisie en bas de la vue Calendrier permet d\'ajouter des événements en langage naturel :');
bullet('"ED LCA 22 avril à 10h15" → crée un événement le 22 avril à 10h15 intitulé "ED LCA"');
bullet('"Dentiste demain" → utilise la date de demain');
bullet('Sans date → utilise le jour sélectionné dans le calendrier');
body('Le moteur de parsing utilise chrono-node en français, qui supporte les expressions relatives (demain, après-demain, aujourd\'hui), absolues (22 avril, le 13 mars) et les heures (à 14h, à 10h30, 14:00).');
body('Un feedback de 3 secondes confirme l\'ajout ou indique l\'erreur.');

sectionTitle('Types d\'événements');
bullet('Révision — fond bleu/violet (couleur accent)');
bullet('Cours — fond secondaire');
bullet('Examen — fond rouge');
bullet('Personnel — fond vert');

// ══════════════════════════════════════════════════════════════════════
// PAGE 14 — STRATÉGIE
// ══════════════════════════════════════════════════════════════════════

newPage('Module Stratégie');
header('12 — Module Stratégie', 'Configuration de la stratégie de révision');

body('Le module Stratégie permet de définir le mode et les paramètres de préparation à l\'examen. La stratégie active est utilisée par le SessionWidget pour générer les sessions quotidiennes et par le WeeklyTracker pour calculer les objectifs.');

sectionTitle('3 modes de stratégie');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Mode Préparation', 60);
doc.moveDown(0.2);
body('Mode principal pour les révisions structurées sur plusieurs semaines/mois.');
bullet('Sélection des matières à travailler (plusieurs possibles)');
bullet('Date d\'examen : définit la deadline pour les calculs d\'objectifs');
bullet('Déroulement en 3 phases automatiques :');
subBullet('Phase 1 : cours + annales N1 pour les nouveaux chapitres');
subBullet('Phase 2 : packs annales N3/N4 pour les chapitres avancés');
subBullet('Phase 3 : annales pures pour les révisions finales');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Mode Rush', 60);
doc.moveDown(0.2);
body('Mode intensif pour un focus sur une seule matière prioritaire.');
bullet('Sélection d\'une seule matière');
bullet('Concentration sur les contenus à haute valeur ajoutée');
bullet('Sessions compressées et ciblées');

doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text('Mode Vacances', 60);
doc.moveDown(0.2);
body('Mode flexible pour maintenir l\'activité en période creuse. Deux sous-objectifs :');
bullet('Révision : maintien de chapitres déjà vus — choix de matière + durée');
bullet('Apprentissage : nouveaux chapitres — choix de matière + portée (cœur de cible vs élargissement) + durée');

sectionTitle('Impact sur le système');
body('La stratégie active conditionne directement :');
bullet('La génération des sessions quotidiennes (quelles matières, quel type de tâches)');
bullet('Le calcul de l\'objectif hebdomadaire dans le WeeklyTracker');
bullet('L\'affichage de la deadline dans la section Deadlines du Cockpit');
bullet('La sélection des matières affichées dans les alertes 48h');

// ══════════════════════════════════════════════════════════════════════
// PAGE 15 — PARAMÈTRES
// ══════════════════════════════════════════════════════════════════════

newPage('Paramètres et données');
header('13 — Paramètres et données', 'ThemeSettingsPanel — apparence et gestion des données');

body('Le panneau de paramètres est accessible via l\'icône engrenage dans la barre de navigation. Il regroupe la personnalisation visuelle, l\'export/import des données, et la gestion du compte.');

sectionTitle('Thèmes visuels');
body('5 thèmes CSS prédéfinis, sélectionnables en un clic :');
bullet('Soft Slate — gris-bleu neutre (défaut)');
bullet('Warm Rose — tons rosés chauds');
bullet('Indigo Night — mode sombre indigo');
bullet('Sage Cream — vert sauge sur fond crème');
bullet('Blush Lavender — lavande et blush');
body('Le thème sélectionné est persisté dans le compte Supabase et appliqué sur tous les appareils connectés.');

sectionTitle('Export des données');
body('Télécharge l\'intégralité des données de l\'utilisateur depuis Supabase sous forme de fichier JSON.');
bullet('Format : tableau de paires {data_key, data_value}');
bullet('Nom de fichier : albugimed-export-AAAA-MM-JJ.json');
bullet('Contient toutes les clés : matières, stratégie, agenda, erreurs, notes, tâches...');
bullet('Utilisable comme sauvegarde ou pour migration');

sectionTitle('Import des données');
body('Restaure des données depuis un fichier JSON exporté précédemment (ou depuis le format de backup legacy).');
bullet('Confirmation obligatoire avant import (alerte : les données actuelles seront écrasées)');
bullet('Upsert dans Supabase pour chaque clé du fichier importé');
bullet('Mise à jour simultanée du localStorage local');
bullet('Page /restore : page dédiée pour importer depuis un ancien format de backup');

sectionTitle('Déconnexion');
body('Le bouton "Déconnexion" :');
bullet('Affiche une confirmation ("Déconnecte et efface les données locales")');
bullet('Supprime toutes les clés med-pilot-* et albugi-* du localStorage');
bullet('Déconnecte la session Supabase');
bullet('Redirige vers la page /login');

// ══════════════════════════════════════════════════════════════════════
// PAGE 16 — SYNCHRONISATION
// ══════════════════════════════════════════════════════════════════════

newPage('Synchronisation et stockage');
header('14 — Synchronisation et stockage', 'Fonctionnement du système hybride');

body('AlbugiMed utilise un système de stockage hybride : le localStorage du navigateur sert de cache pour un démarrage instantané, et Supabase est la source de vérité pour la synchronisation cross-device.');

sectionTitle('Flux de données au montage');
bullet('1. Lecture synchrone du localStorage → état initial visible immédiatement (0 ms)');
bullet('2. Appel asynchrone à Supabase → si données cloud disponibles, elles remplacent le cache');
bullet('3. Résultat : UI instantanée + données à jour sans délai perçu');

sectionTitle('Flux de données à l\'écriture');
bullet('1. Mise à jour de l\'état React (UI réactive immédiate)');
bullet('2. Écriture dans le localStorage (persistance locale)');
bullet('3. Upsert asynchrone dans Supabase user_data (persistance cloud, fire-and-forget)');

sectionTitle('Comportement hors connexion');
body('Si l\'utilisateur n\'a pas de connexion internet :');
bullet('Les données localStorage restent disponibles — l\'app fonctionne normalement');
bullet('Les écritures sont enregistrées en local uniquement');
bullet('Aucune file d\'attente de sync offline : les changements hors-ligne ne sont pas pushés automatiquement au retour en ligne');
bullet('Recommandation : éviter de modifier des données depuis deux appareils simultanément (pas de résolution de conflits)');

sectionTitle('Cas particulier : clé API Gemini');
body('La clé API Gemini est gérée différemment des autres données :');
bullet('Jamais écrite dans le localStorage (sécurité)');
bullet('Stockée uniquement dans Supabase user_data');
bullet('Migration automatique si une ancienne clé est détectée en localStorage (effacement après migration)');
bullet('IA désactivée si l\'utilisateur n\'est pas connecté');

sectionTitle('Migration initiale');
body('À la première connexion, le hook useMigration s\'exécute une seule fois :');
bullet('Lit toutes les clés connues du localStorage');
bullet('Les upsert dans Supabase user_data');
bullet('Pose un flag "migration-done" pour éviter la ré-exécution');
bullet('Un composant de notification (MigrationRunner) affiche l\'état de la migration');

// ══════════════════════════════════════════════════════════════════════
// PAGE 17 — NOTE D'ARCHITECTURE
// ══════════════════════════════════════════════════════════════════════

newPage("Note d'architecture");
header("15 — Note d'architecture — problèmes connus", 'Limitations et points d\'attention');

body("Cette section documente les limitations architecturales connues et les comportements à surveiller lors de l'utilisation ou de l'évolution du système.");

sectionTitle('Race condition migration / fetch cloud');
body("Problème identifié : lors de la première connexion, useMigration (pousse local → cloud) et useCloudStorage (tire cloud → local) s'exécutent simultanément. Si le fetch cloud se termine avant la migration :");
bullet('Les données cloud (potentiellement vides ou anciennes) écrasent le localStorage');
bullet('La migration lit alors le localStorage déjà écrasé et pousse les anciennes données dans Supabase');
bullet('Résultat : perte des données locales si Supabase avait déjà des données d\'une session précédente');
body("Solution de contournement : utiliser l'export de données depuis l'appareil source avant la première connexion sur un nouvel appareil, puis importer via le panneau Paramètres.");

sectionTitle('Pas de résolution de conflits');
body('Si un utilisateur modifie des données sur deux appareils simultanément, le dernier à écrire dans Supabase gagne. Il n\'y a pas de merge automatique des changements concurrents.');

sectionTitle('Pas de sync offline → online');
body('Les modifications effectuées hors connexion ne sont pas envoyées automatiquement vers Supabase au retour en ligne. Elles restent dans le localStorage local jusqu\'à la prochaine action de l\'utilisateur qui déclenchera une écriture.');

sectionTitle('Clé API IA partagée avec compte');
body('La clé API Gemini est liée au compte Supabase. Si l\'utilisateur se connecte sur un autre appareil, la même clé est utilisée. Il n\'est pas possible d\'avoir une clé différente par appareil.');

sectionTitle('Dépendances critiques');
label('Supabase :', 'Toute indisponibilité de Supabase n\'empêche pas l\'utilisation (fallback localStorage), mais bloque la sync et la connexion');
label('Gemini API :', 'Toute indisponibilité ou quota dépassé désactive le simulateur DP et l\'export Anki IA');
label('chrono-node :', 'Le parsing NLP peut échouer sur des formulations atypiques — l\'étudiant peut toujours sélectionner manuellement le jour dans le calendrier');

sectionTitle('Modules non encore implémentés');
body('L\'onglet "À venir" dans la navigation indique des fonctionnalités planifiées mais non développées à ce stade.');

// ── Footer sur chaque page (post-processing non trivial avec pdfkit)
// On skip, pdfkit ne supporte pas les event handlers de page facilement

doc.end();
output.on('finish', () => {
  console.log('PDF généré : D:/AlbugiMed/Presentation_AlbugiMed.pdf');
});
output.on('error', (err) => {
  console.error('Erreur:', err);
});
