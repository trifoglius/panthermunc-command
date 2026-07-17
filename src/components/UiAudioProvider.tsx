"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  applyAudioPrefs,
  pauseBgmForVisibility,
  playSfx,
  readAudioPrefs,
  setAlarmAudioElement,
  setBgmPaths,
  stopBgm,
  unlockAudio,
  writeAudioPrefs,
  type AudioPrefs,
} from "@/lib/ui-audio";
import { bgmPathsForScene, SOUND_MANIFEST, type BgmScene } from "@/lib/sound-manifest";

type UiAudioContextValue = {
  prefs: AudioPrefs;
  setMuted: (muted: boolean) => void;
  setBgmVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setSfxEnabled: (enabled: boolean) => void;
  toggleMute: () => void;
  playSelect: () => void;
  playConfirm: () => void;
  playBack: () => void;
  playError: () => void;
};

const UiAudioContext = createContext<UiAudioContextValue | null>(null);

function resolveScene(
  pathname: string,
  hasCommittee: boolean,
  hasTab: boolean
): BgmScene {
  if (pathname.startsWith("/login")) return "login";
  if (pathname === "/settings" || pathname.startsWith("/admin")) return "home";
  if (pathname === "/") {
    if (hasCommittee && hasTab) return "workspace";
    return "home";
  }
  return "none";
}

function useAudioPrefsState() {
  const [prefs, setPrefs] = useState<AudioPrefs>(() => readAudioPrefs());

  const updatePrefs = useCallback((next: AudioPrefs) => {
    setPrefs(next);
    writeAudioPrefs(next);
    applyAudioPrefs(next);
  }, []);

  useEffect(() => {
    applyAudioPrefs(prefs);
  }, [prefs]);

  return { prefs, updatePrefs };
}

function BgmSceneController() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const committee = searchParams.get("committee");
    const tab = searchParams.get("tab");
    const scene = resolveScene(pathname, !!committee, !!tab);
    const paths = bgmPathsForScene(scene);
    if (paths.length === 0) stopBgm();
    else setBgmPaths(paths);
  }, [pathname, searchParams]);

  return null;
}

function UiAudioInner({ children }: { children: ReactNode }) {
  const alarmRef = useRef<HTMLAudioElement>(null);
  const { prefs, updatePrefs } = useAudioPrefsState();

  useEffect(() => {
    const audio = alarmRef.current;
    if (!audio) return;
    setAlarmAudioElement(audio);
    return () => setAlarmAudioElement(null);
  }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);

  useEffect(() => {
    const onVis = () => pauseBgmForVisibility(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const value = useMemo<UiAudioContextValue>(
    () => ({
      prefs,
      setMuted: (muted) => updatePrefs({ ...prefs, muted }),
      setBgmVolume: (bgmVolume) => updatePrefs({ ...prefs, bgmVolume }),
      setSfxVolume: (sfxVolume) => updatePrefs({ ...prefs, sfxVolume }),
      setSfxEnabled: (sfxEnabled) => updatePrefs({ ...prefs, sfxEnabled }),
      toggleMute: () => updatePrefs({ ...prefs, muted: !prefs.muted }),
      playSelect: () => playSfx("sfxSelect"),
      playConfirm: () => playSfx("sfxConfirm"),
      playBack: () => playSfx("sfxBack"),
      playError: () => playSfx("sfxError"),
    }),
    [prefs, updatePrefs]
  );

  return (
    <UiAudioContext.Provider value={value}>
      <Suspense fallback={null}>
        <BgmSceneController />
      </Suspense>
      {children}
      <audio
        ref={alarmRef}
        src={SOUND_MANIFEST.alarm[0]}
        preload="auto"
        playsInline
        aria-hidden
      />
    </UiAudioContext.Provider>
  );
}

export function UiAudioProvider({ children }: { children: ReactNode }) {
  return <UiAudioInner>{children}</UiAudioInner>;
}

export function useUiAudio() {
  const ctx = useContext(UiAudioContext);
  if (!ctx) {
    return {
      prefs: readAudioPrefs(),
      setMuted: () => {},
      setBgmVolume: () => {},
      setSfxVolume: () => {},
      setSfxEnabled: () => {},
      toggleMute: () => {},
      playSelect: () => {},
      playConfirm: () => {},
      playBack: () => {},
      playError: () => {},
    } satisfies UiAudioContextValue;
  }
  return ctx;
}
