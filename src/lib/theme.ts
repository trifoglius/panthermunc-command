export const THEME_STORAGE_KEY = "panthermunc-theme";

export const THEMES = [
  {
    id: "classic",
    label: "Classic",
    description: "Purple chrome · bright plaza world",
  },
  {
    id: "frutiger-aero",
    label: "Home Menu",
    description: "Wii U–style glass plaza",
  },
  {
    id: "classy",
    label: "Classy",
    description: "Ivory, brass, and serif type",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "frutiger-aero";

export const THEME_IDS = THEMES.map((t) => t.id);

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyThemeToDocument(theme: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}
