import React, { SVGProps } from 'react';

export interface MedIconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
}

const defaults: SVGProps<SVGSVGElement> = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

function icon(fn: (p: MedIconProps) => React.JSX.Element) { return fn; }

// ── 1. Néphrologie — Reins ──
export const IconKidneys = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Left kidney */}
        <path d="M7 4C5.5 4 4 5.5 4 8c0 2 .5 3.5 1.5 5s1.5 3 1.5 5c0 1.5.5 2 1.5 2s1.5-.8 1.5-2c0-1-.3-2-1-3.5" />
        <path d="M7 4c1 0 2 1 2 2.5S8.5 9 7.5 9" />
        {/* Right kidney */}
        <path d="M17 4c1.5 0 3 1.5 3 4 0 2-.5 3.5-1.5 5s-1.5 3-1.5 5c0 1.5-.5 2-1.5 2s-1.5-.8-1.5-2c0-1 .3-2 1-3.5" />
        <path d="M17 4c-1 0-2 1-2 2.5s.5 2.5 1.5 2.5" />
        {/* Connecting line (ureter hint) */}
        <line x1="8.5" y1="18" x2="12" y2="21" />
        <line x1="15.5" y1="18" x2="12" y2="21" />
    </svg>
));

// ── 2. Urologie — Vessie ──
export const IconBladder = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        <ellipse cx="12" cy="11" rx="5.5" ry="6" />
        <path d="M9.5 5.5C9.5 4 10 3 10.5 2" />
        <path d="M14.5 5.5C14.5 4 14 3 13.5 2" />
        <path d="M12 17v4" />
        <path d="M10.5 21h3" />
    </svg>
));

// ── 3. Endocrinologie — Thyroïde ──
export const IconThyroid = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Butterfly shape thyroid */}
        <path d="M12 6v12" />
        <path d="M12 8c-2 0-4 .5-5 2s-1.5 4-.5 5.5S9 17 12 15" />
        <path d="M12 8c2 0 4 .5 5 2s1.5 4 .5 5.5S15 17 12 15" />
        {/* Isthmus */}
        <path d="M10 11.5h4" />
        {/* Pill icon hint */}
        <circle cx="18" cy="5" r="2" />
        <line x1="17" y1="5" x2="19" y2="5" />
    </svg>
));

// ── 4. Gynécologie — Utérus ──
export const IconUterus = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Fallopian tubes */}
        <path d="M4.5 6a2 2 0 1 1 2.5 1.5L8 9" />
        <path d="M19.5 6a2 2 0 1 0-2.5 1.5L16 9" />
        {/* Uterus body */}
        <path d="M8 9c0 2-1 4-1 6 0 2.5 2 5 5 5s5-2.5 5-5c0-2-1-4-1-6" />
        {/* Cervix */}
        <path d="M10 18h4" />
    </svg>
));

// ── 5. Neurologie — Cerveau ──
export const IconBrain = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        <path d="M12 3c-1.5 0-3 .5-4 1.5C7 5.5 6 7 6 9c-1.5.5-2.5 2-2.5 3.5 0 1.5 1 3 2.5 3.5 0 1.5 1 3 3 3.5 1 .3 2 .5 3 .5" />
        <path d="M12 3c1.5 0 3 .5 4 1.5C17 5.5 18 7 18 9c1.5.5 2.5 2 2.5 3.5 0 1.5-1 3-2.5 3.5 0 1.5-1 3-3 3.5-1 .3-2 .5-3 .5" />
        {/* Central fold */}
        <path d="M12 3v17" />
        {/* Sulci */}
        <path d="M8 8.5c1.5 0 3 .5 4 1" />
        <path d="M16 8.5c-1.5 0-3 .5-4 1" />
        <path d="M7 13c1.5-.5 3.5-.5 5 0" />
        <path d="M17 13c-1.5-.5-3.5-.5-5 0" />
    </svg>
));

// ── 6. Pneumologie — Poumons ──
export const IconLungs = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Trachea */}
        <path d="M12 2v6" />
        <path d="M12 8l-3 2" />
        <path d="M12 8l3 2" />
        {/* Left lung */}
        <path d="M9 10c-2 1-4.5 3-4.5 7 0 2.5 2 4 4 4 1.5 0 2.5-.5 3.5-2" />
        {/* Right lung */}
        <path d="M15 10c2 1 4.5 3 4.5 7 0 2.5-2 4-4 4-1.5 0-2.5-.5-3.5-2" />
        {/* Bronchi lines */}
        <path d="M9 13h-.5" />
        <path d="M15 13h.5" />
    </svg>
));

// ── 7. HGE — Estomac ──
export const IconStomach = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Esophagus */}
        <path d="M10 2c0 2-1 3-1 5" />
        {/* Stomach body */}
        <path d="M9 7c-3 0-5 2-5 5 0 4 3 7 6 8 2 .5 4 0 5.5-1.5" />
        {/* Greater curvature */}
        <path d="M9 7c2 0 4-1 6 0 2.5 1.2 3.5 3.5 3 6-.5 2-2 3.5-3.5 3.5" />
        {/* Pylorus hint */}
        <path d="M15.5 18c1-.5 2-1 3-1" />
    </svg>
));

// ── 8. Infectiologie — Virus ──
export const IconVirus = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        <circle cx="12" cy="12" r="5" />
        {/* Spikes */}
        <line x1="12" y1="2" x2="12" y2="7" /><circle cx="12" cy="2" r="1" fill="currentColor" />
        <line x1="12" y1="17" x2="12" y2="22" /><circle cx="12" cy="22" r="1" fill="currentColor" />
        <line x1="2" y1="12" x2="7" y2="12" /><circle cx="2" cy="12" r="1" fill="currentColor" />
        <line x1="17" y1="12" x2="22" y2="12" /><circle cx="22" cy="12" r="1" fill="currentColor" />
        <line x1="5.05" y1="5.05" x2="8.5" y2="8.5" /><circle cx="4.5" cy="4.5" r="1" fill="currentColor" />
        <line x1="15.5" y1="15.5" x2="18.95" y2="18.95" /><circle cx="19.5" cy="19.5" r="1" fill="currentColor" />
        <line x1="5.05" y1="18.95" x2="8.5" y2="15.5" /><circle cx="4.5" cy="19.5" r="1" fill="currentColor" />
        <line x1="15.5" y1="8.5" x2="18.95" y2="5.05" /><circle cx="19.5" cy="4.5" r="1" fill="currentColor" />
        {/* Inner dots */}
        <circle cx="10.5" cy="10.5" r=".7" fill="currentColor" />
        <circle cx="14" cy="11" r=".7" fill="currentColor" />
        <circle cx="11.5" cy="14" r=".7" fill="currentColor" />
    </svg>
));

// ── 9. Santé publique — Globe ──
export const IconGlobe = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4" ry="10" />
        <path d="M2 12h20" />
        <path d="M4.5 7h15" />
        <path d="M4.5 17h15" />
    </svg>
));

// ── 10. Pédiatrie — Ourson ──
export const IconTeddyBear = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Ears */}
        <circle cx="6.5" cy="5.5" r="2.5" />
        <circle cx="17.5" cy="5.5" r="2.5" />
        {/* Head */}
        <circle cx="12" cy="11" r="7" />
        {/* Eyes */}
        <circle cx="9.5" cy="10" r=".8" fill="currentColor" />
        <circle cx="14.5" cy="10" r=".8" fill="currentColor" />
        {/* Nose */}
        <ellipse cx="12" cy="12.5" rx="2" ry="1.3" />
        <circle cx="12" cy="12" r=".6" fill="currentColor" />
        {/* Mouth */}
        <path d="M10.5 14c.5.7 1 1 1.5 1s1-.3 1.5-1" />
    </svg>
));

// ── 11. ORL + Ophtalmo — Oreille + Œil ──
export const IconEarEye = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Ear */}
        <path d="M4 10c0-3 2-6 5-7s4 0 4.5 1.5c.5 2-1 3-2 3.5s-1.5 1-1.5 2.5c0 1 .5 1.5 1 2" />
        <path d="M8.5 14c-1 1-2 1.5-3 1.5" />
        {/* Eye */}
        <path d="M14 17c1.5-1.5 3-2.5 5-2.5s3.5 1 5 2.5" />
        <path d="M14 17c1.5 1.5 3 2.5 5 2.5s3.5-1 5-2.5" />
        <circle cx="19" cy="17" r="1.5" />
    </svg>
));

// ── 12. Douleur & Soins palliatifs — Main + plume ──
export const IconHandFeather = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Hand open */}
        <path d="M8 22c-1 0-3-.5-4-2s-1-3 0-4l2-3c.5-.7 1-1 2-1h5c1 0 2 .5 2.5 1.5l1.5 3" />
        {/* Feather floating above */}
        <path d="M13 2c2 1 4 3 4.5 5.5S17 11 15 12" />
        <path d="M13 2c-1 2-1 5 0 7s2 3.5 2 3.5" />
        <path d="M13 2l2 10" />
        {/* Feather vanes */}
        <path d="M11 6l4 1" />
        <path d="M11.5 8.5l3.5.5" />
    </svg>
));

// ── 13. Anesthésie-réa / Urgences — Sirène ──
export const IconSiren = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Light dome */}
        <path d="M8 14h8l1-3c.3-1 .5-2 .5-3 0-3-2.5-5.5-5.5-5.5S6.5 5 6.5 8c0 1 .2 2 .5 3z" />
        {/* Base */}
        <rect x="5" y="14" width="14" height="3" rx="1" />
        <rect x="7" y="17" width="10" height="2.5" rx="1" />
        {/* Light rays */}
        <path d="M4 8h-2" />
        <path d="M22 8h-2" />
        <path d="M5 4L3.5 2.5" />
        <path d="M19 4l1.5-1.5" />
    </svg>
));

// ── 14. Médecine interne — Personne + stéthoscope ──
export const IconPersonStethoscope = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Head */}
        <circle cx="10" cy="4.5" r="2.5" />
        {/* Body */}
        <path d="M6 22v-5c0-2.5 1.5-4 4-4h2" />
        <path d="M14 22v-5c0-2.5-1.5-4-4-4" />
        {/* Stethoscope */}
        <path d="M15 9c1 0 2 .5 2.5 1.5.5 1 .5 2.5-.5 3.5" />
        <path d="M19.5 9c-1 0-2 .5-2.5 1.5" />
        <circle cx="15" cy="9" r=".8" fill="currentColor" />
        <circle cx="19.5" cy="9" r=".8" fill="currentColor" />
        <circle cx="17" cy="15.5" r="1.5" />
    </svg>
));

// ── 15. Gériatrie — Personne âgée + canne ──
export const IconElderly = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Head */}
        <circle cx="11" cy="4" r="2.5" />
        {/* Hunched body */}
        <path d="M9 9c-1 2-2 4-2.5 6L5 22" />
        <path d="M9 9c1 0 2.5 1 3 3l1 4-1 6" />
        {/* Arm to cane */}
        <path d="M10 13l5 1" />
        {/* Cane */}
        <path d="M18 9v13" />
        <path d="M17 9c0-1 .5-1.5 1-1.5s1 .5 1 1.5" />
    </svg>
));

// ── 16. Dermatologie — Main + flamme/peau ──
export const IconDermatology = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Hand base */}
        <path d="M5 22c-1 0-2-.5-2.5-1.5S2 18.5 2.5 17l2-4c.5-1 1.5-1.5 2.5-1.5h4c1.5 0 2.5.5 3 1.5" />
        <path d="M14 14l1 3v5" />
        {/* Flame/skin element above */}
        <path d="M13 2c1 2 2 3.5 2 5.5 0 1.5-.8 3-2 3s-2-1.2-2-2.5c0-.8.5-1.8 1-2.5" />
        <path d="M10 4c-.5 1-1 2.5-1 4 0 2 1 3.5 2.5 3.5" />
    </svg>
));

// ── 17. Hématologie — Goutte de sang ──
export const IconBloodDrop = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        <path d="M12 2C9.5 7 5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-4.5-8-7-13z" />
        {/* Inner highlight */}
        <path d="M9.5 16c0-2 1.5-4 3-5.5" />
    </svg>
));

// ── 18. Psychiatrie — Tête puzzle ──
export const IconPuzzleHead = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Head silhouette */}
        <path d="M6 18V9c0-4 2.5-7 6-7s6 3 6 7v2c0 2-1 3.5-2.5 4.5L14 18" />
        {/* Jaw */}
        <path d="M6 18c0 1 .5 2 1.5 2.5L9 22h6l1.5-1.5c1-.5 1.5-1.5 1.5-2.5" />
        {/* Puzzle piece cut */}
        <path d="M14 8v3h2.5c0-1 .8-1.5 1.5-1.5s1.5.5 1.5 1.5" />
        <path d="M14 11v3" />
        {/* Puzzle piece floating out */}
        <rect x="16" y="7" width="5" height="5" rx="1" />
        <path d="M18.5 7v-1c0-.5.3-1 .7-1" />
    </svg>
));

// ── 19. Médecine générale — Trousse premiers secours ──
export const IconFirstAidKit = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        <rect x="2" y="7" width="20" height="14" rx="2.5" />
        {/* Handle */}
        <path d="M8 7V5c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        {/* Cross */}
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
));

// ── 20. Médecine légale — Marteau ──
export const IconGavel = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Hammer head */}
        <rect x="3" y="2" width="12" height="5" rx="1.5" transform="rotate(30 9 4.5)" />
        {/* Handle */}
        <path d="M11 10l5 9" />
        {/* Strike base */}
        <path d="M6 20h12" />
        <path d="M7 22h10" />
    </svg>
));

// ── 21. Médecine du travail — Casque ──
export const IconHardHat = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Dome */}
        <path d="M3 14h18" />
        <path d="M4 14c0-5 3.5-9 8-9s8 4 8 9" />
        {/* Visor ridge */}
        <path d="M2 14c0 1.5 1 3 2.5 3h15c1.5 0 2.5-1.5 2.5-3" />
        {/* Top button */}
        <circle cx="12" cy="5" r=".5" fill="currentColor" />
        {/* Inner support lines */}
        <path d="M8 14v-2c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5v2" />
    </svg>
));

// ── 22. Cancérologie — Ruban + cible ──
export const IconCancerRibbon = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        {/* Ribbon */}
        <path d="M12 6c-2-3-5-4-6-3s0 3 2 5l4 4 4-4c2-2 3-4 2-5s-4 0-6 3z" />
        <path d="M8 12l-2 8 4-2 4 2-2-8" />
        {/* Small target/cell hint */}
        <circle cx="19" cy="18" r="3" />
        <circle cx="19" cy="18" r="1.2" />
        <circle cx="19" cy="18" r=".3" fill="currentColor" />
    </svg>
));

// ── Masque chirurgical (bonus — anesthésie alt) ──
export const IconSurgicalMask = icon(({ size = 24, className, ...rest }: MedIconProps) => (
    <svg {...defaults} width={size} height={size} className={className} {...rest}>
        <path d="M3 9c0-1 1-2 2-2h14c1 0 2 1 2 2v4c0 3-4 5-9 5s-9-2-9-5z" />
        {/* Ear loops */}
        <path d="M3 10c-1 0-1.5-1-1.5-2" />
        <path d="M21 10c1 0 1.5-1 1.5-2" />
        {/* Fold lines */}
        <line x1="5" y1="10.5" x2="19" y2="10.5" />
        <line x1="5" y1="13" x2="19" y2="13" />
    </svg>
));

// ──────────────────────────────────
// ICON MAP — maps string keys to components
// ──────────────────────────────────
export const MEDICAL_ICON_MAP: Record<string, React.FC<MedIconProps>> = {
    Kidneys: IconKidneys,
    Bladder: IconBladder,
    Thyroid: IconThyroid,
    Uterus: IconUterus,
    BrainMed: IconBrain,
    Lungs: IconLungs,
    Stomach: IconStomach,
    Virus: IconVirus,
    Globe: IconGlobe,
    TeddyBear: IconTeddyBear,
    EarEye: IconEarEye,
    HandFeather: IconHandFeather,
    Siren: IconSiren,
    PersonStethoscope: IconPersonStethoscope,
    Elderly: IconElderly,
    Dermatology: IconDermatology,
    BloodDrop: IconBloodDrop,
    PuzzleHead: IconPuzzleHead,
    FirstAidKit: IconFirstAidKit,
    Gavel: IconGavel,
    HardHat: IconHardHat,
    CancerRibbon: IconCancerRibbon,
    SurgicalMask: IconSurgicalMask,
};

// Ordered list for the icon picker
export const MEDICAL_ICON_NAMES = Object.keys(MEDICAL_ICON_MAP);

// Label map for display in picker
export const MEDICAL_ICON_LABELS: Record<string, string> = {
    Kidneys: 'Néphrologie',
    Bladder: 'Urologie',
    Thyroid: 'Endocrino',
    Uterus: 'Gynécologie',
    BrainMed: 'Neurologie',
    Lungs: 'Pneumologie',
    Stomach: 'HGE',
    Virus: 'Infectiologie',
    Globe: 'Santé publique',
    TeddyBear: 'Pédiatrie',
    EarEye: 'ORL / Ophtalmo',
    HandFeather: 'Soins palliatifs',
    Siren: 'Urgences / Réa',
    PersonStethoscope: 'Méd. interne',
    Elderly: 'Gériatrie',
    Dermatology: 'Dermatologie',
    BloodDrop: 'Hématologie',
    PuzzleHead: 'Psychiatrie',
    FirstAidKit: 'Méd. générale',
    Gavel: 'Méd. légale',
    HardHat: 'Méd. du travail',
    CancerRibbon: 'Cancérologie',
    SurgicalMask: 'Masque chir.',
};
