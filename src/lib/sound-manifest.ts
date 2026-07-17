/**
 * Canonical audio paths. Drop files into `public/sounds/` (or use the
 * login fallback) — missing files are silent no-ops.
 */
export const SOUND_MANIFEST = {
  bgmLogin: ["/sounds/bgm-login.mp3", "/login.mp3"],
  bgmHome: ["/sounds/bgm-home.mp3"],
  bgmWorkspace: ["/sounds/bgm-workspace.mp3"],
  sfxSelect: ["/sounds/sfx-select.wav"],
  sfxConfirm: ["/sounds/sfx-confirm.wav"],
  sfxBack: ["/sounds/sfx-back.wav"],
  sfxError: ["/sounds/sfx-error.wav"],
  alarm: ["/alarm_sound.wav"],
} as const;

export type SoundId = keyof typeof SOUND_MANIFEST;

export type BgmScene = "login" | "home" | "workspace" | "none";

export function bgmPathsForScene(scene: BgmScene): readonly string[] {
  if (scene === "login") return SOUND_MANIFEST.bgmLogin;
  if (scene === "home") return SOUND_MANIFEST.bgmHome;
  if (scene === "workspace") return SOUND_MANIFEST.bgmWorkspace;
  return [];
}
