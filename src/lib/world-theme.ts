import type { ThemeId } from "@/lib/theme";

/**
 * WaraWara Plaza / Frutiger Aero world palette.
 * Floor + sky stay bright white for every theme; only accents tint.
 */
export type WorldPalette = {
  clear: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  ground: string;
  groundAccent: string;
  cube: string;
  cubeEmissive: string;
  accent: string;
  rim: string;
  ambient: number;
  sun: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  envIntensity: number;
  exposure: number;
  shadowOpacity: number;
  shadowColor: string;
};

/** Shared plaza base — bright infinite white space + light floor. */
const PLAZA_BASE = {
  clear: "#f5f8fb",
  fog: "#f0f6fa",
  fogNear: 18,
  fogFar: 52,
  ground: "#f4f7fa",
  groundAccent: "#d5e4ee",
  ambient: 1.85,
  sun: "#ffffff",
  sunIntensity: 2.55,
  hemiSky: "#ffffff",
  hemiGround: "#e4eef4",
  hemiIntensity: 1.15,
  envIntensity: 1.4,
  exposure: 1.62,
  shadowOpacity: 0.2,
  shadowColor: "#9aa8b4",
} as const;

const PALETTES: Record<ThemeId, WorldPalette> = {
  "frutiger-aero": {
    ...PLAZA_BASE,
    cube: "#dff3fb",
    cubeEmissive: "#b8e6f5",
    accent: "#2fc0e4",
    rim: "#7adcf0",
  },
  classic: {
    ...PLAZA_BASE,
    // Accents only — never purple floor/sky
    cube: "#f3ecff",
    cubeEmissive: "#e0d4f5",
    accent: "#9b6dff",
    rim: "#c4a0ff",
  },
  classy: {
    ...PLAZA_BASE,
    clear: "#f6f3ee",
    fog: "#f8f5f0",
    ground: "#f2efe9",
    groundAccent: "#e8e3da",
    cube: "#fffaf3",
    cubeEmissive: "#efe6d8",
    accent: "#b08d57",
    rim: "#c9a66b",
  },
};

export function getWorldPalette(theme: ThemeId): WorldPalette {
  return PALETTES[theme] ?? PALETTES["frutiger-aero"];
}
