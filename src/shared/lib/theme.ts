export const THEME_IDS = [
    "soft-slate",
    "warm-rose",
    "indigo-night",
    "sage-cream",
    "blush-lavender",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "soft-slate";
export const THEME_STORAGE_KEY = "medpilot-theme";

export const isThemeId = (value: string | null | undefined): value is ThemeId =>
    THEME_IDS.includes(value as ThemeId);

export const resolveTheme = (value: string | null | undefined): ThemeId =>
    isThemeId(value) ? value : DEFAULT_THEME;

export const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const key = "${THEME_STORAGE_KEY}";
  const themes = ${JSON.stringify(THEME_IDS)};
  const fallback = "${DEFAULT_THEME}";

  try {
    const saved = window.localStorage.getItem(key);
    const theme = themes.includes(saved) ? saved : fallback;
    document.documentElement.setAttribute("data-theme", theme);
  } catch (_error) {
    document.documentElement.setAttribute("data-theme", fallback);
  }
})();`;
