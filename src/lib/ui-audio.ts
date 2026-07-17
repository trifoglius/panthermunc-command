import { SOUND_MANIFEST, type SoundId } from "@/lib/sound-manifest";

export const AUDIO_PREFS_KEY = "panthermunc-audio-prefs";

export type AudioPrefs = {
  muted: boolean;
  bgmVolume: number;
  sfxVolume: number;
  sfxEnabled: boolean;
};

export const DEFAULT_AUDIO_PREFS: AudioPrefs = {
  muted: false,
  bgmVolume: 0.35,
  sfxVolume: 0.55,
  sfxEnabled: true,
};

let unlocked = false;
let masterMuted = false;
let bgmVolume = DEFAULT_AUDIO_PREFS.bgmVolume;
let sfxVolume = DEFAULT_AUDIO_PREFS.sfxVolume;
let sfxEnabled = true;

let bgmEl: HTMLAudioElement | null = null;
let alarmEl: HTMLAudioElement | null = null;
let currentBgmPaths: readonly string[] = [];
let bgmIndex = 0;

const missingPaths = new Set<string>();

export function readAudioPrefs(): AudioPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_AUDIO_PREFS };
  try {
    const raw = window.localStorage.getItem(AUDIO_PREFS_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_PREFS };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      muted: Boolean(parsed.muted),
      bgmVolume: clamp01(parsed.bgmVolume ?? DEFAULT_AUDIO_PREFS.bgmVolume),
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULT_AUDIO_PREFS.sfxVolume),
      sfxEnabled: parsed.sfxEnabled !== false,
    };
  } catch {
    return { ...DEFAULT_AUDIO_PREFS };
  }
}

export function writeAudioPrefs(prefs: AudioPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function setAlarmAudioElement(element: HTMLAudioElement | null) {
  alarmEl = element;
}

export function applyAudioPrefs(prefs: AudioPrefs) {
  masterMuted = prefs.muted;
  bgmVolume = clamp01(prefs.bgmVolume);
  sfxVolume = clamp01(prefs.sfxVolume);
  sfxEnabled = prefs.sfxEnabled;
  if (bgmEl) {
    bgmEl.muted = masterMuted;
    bgmEl.volume = bgmVolume;
  }
  if (alarmEl) {
    alarmEl.muted = masterMuted;
  }
}

/** Call during a user gesture so playback works later. */
export function unlockAudio() {
  if (unlocked || typeof window === "undefined") return;
  unlocked = true;

  const probe = alarmEl ?? new Audio(SOUND_MANIFEST.alarm[0]);
  probe.volume = 0.001;
  void probe
    .play()
    .then(() => {
      probe.pause();
      probe.currentTime = 0;
    })
    .catch(() => {});

  if (currentBgmPaths.length > 0) {
    void ensureBgmPlaying();
  }
}

export function unlockAlarmSound() {
  unlockAudio();
}

function markMissing(src: string) {
  missingPaths.add(src);
}

function createAudio(src: string) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.addEventListener("error", () => markMissing(src), { once: true });
  return audio;
}

async function tryPlay(el: HTMLAudioElement) {
  try {
    await el.play();
    return true;
  } catch {
    return false;
  }
}

async function ensureBgmPlaying() {
  if (!unlocked || typeof window === "undefined") return;
  if (document.hidden) return;
  if (!currentBgmPaths.length) return;

  while (bgmIndex < currentBgmPaths.length) {
    const src = currentBgmPaths[bgmIndex];
    if (missingPaths.has(src)) {
      bgmIndex += 1;
      continue;
    }

    if (!bgmEl || bgmEl.dataset.src !== src) {
      if (bgmEl) {
        bgmEl.pause();
        bgmEl = null;
      }
      bgmEl = createAudio(src);
      bgmEl.dataset.src = src;
      bgmEl.loop = true;
      bgmEl.volume = bgmVolume;
      bgmEl.muted = masterMuted;
    }

    const ok = await tryPlay(bgmEl);
    if (ok) return;

    // Likely missing file or blocked — try next candidate
    markMissing(src);
    bgmIndex += 1;
  }
}

export function setBgmPaths(paths: readonly string[]) {
  const same =
    paths.length === currentBgmPaths.length &&
    paths.every((p, i) => p === currentBgmPaths[i]);
  if (same) {
    void ensureBgmPlaying();
    return;
  }

  currentBgmPaths = paths;
  bgmIndex = 0;
  if (bgmEl) {
    bgmEl.pause();
    bgmEl = null;
  }
  if (paths.length === 0) return;
  void ensureBgmPlaying();
}

export function stopBgm() {
  currentBgmPaths = [];
  bgmIndex = 0;
  if (bgmEl) {
    bgmEl.pause();
    bgmEl = null;
  }
}

export function pauseBgmForVisibility(hidden: boolean) {
  if (!bgmEl) return;
  if (hidden) {
    bgmEl.pause();
  } else if (unlocked && currentBgmPaths.length > 0) {
    void ensureBgmPlaying();
  }
}

export function playSfx(id: Exclude<SoundId, "bgmLogin" | "bgmHome" | "bgmWorkspace" | "alarm">) {
  if (!unlocked || masterMuted || !sfxEnabled || typeof window === "undefined") {
    return;
  }
  const paths = SOUND_MANIFEST[id];
  for (const src of paths) {
    if (missingPaths.has(src)) continue;
    const audio = createAudio(src);
    audio.volume = sfxVolume;
    void tryPlay(audio).then((ok) => {
      if (!ok) markMissing(src);
    });
    return;
  }
}

export function playAlarmSound() {
  if (typeof window === "undefined") return;
  unlockAudio();

  const playEl = (audio: HTMLAudioElement) => {
    audio.muted = masterMuted;
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  };

  if (alarmEl) {
    playEl(alarmEl);
    return;
  }

  const src = SOUND_MANIFEST.alarm[0];
  if (missingPaths.has(src)) return;
  const fallback = createAudio(src);
  playEl(fallback);
}

export function isAudioUnlocked() {
  return unlocked;
}
