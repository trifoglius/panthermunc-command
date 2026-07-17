"use client";

import { useEffect, useRef, useState } from "react";
import { useUiAudio } from "@/components/UiAudioProvider";
import {
  GlyphAudio,
  GlyphMuted,
} from "@/components/home/HomeGlyphs";

/** Audio-only dock — destinations live as world cubes. */
export function UtilityDock({
  className = "",
}: {
  className?: string;
  /** @deprecated Destinations are world cubes; ignored. */
  showTheme?: boolean;
  /** @deprecated Destinations are world cubes; ignored. */
  showOps?: boolean;
}) {
  const {
    prefs,
    toggleMute,
    setBgmVolume,
    setSfxVolume,
    setSfxEnabled,
    setMuted,
  } = useUiAudio();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <nav
      className={`utility-dock ${className}`}
      aria-label="Audio"
      ref={ref}
    >
      <div className="relative">
        <button
          type="button"
          className={`dock-item ${prefs.muted ? "dock-item-slate" : "dock-item-rose"}`}
          aria-label={prefs.muted ? "Unmute audio" : "Audio settings"}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
          title={prefs.muted ? "Muted" : "Audio"}
        >
          {prefs.muted ? <GlyphMuted /> : <GlyphAudio />}
        </button>
        {open && (
          <div
            role="dialog"
            aria-label="Audio settings"
            className="theme-menu absolute bottom-full right-0 z-40 mb-2 w-56 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[color:var(--purple-dark)]">
                Audio
              </span>
              <button
                type="button"
                className="text-xs font-medium text-[color:var(--purple-primary)] underline"
                onClick={() => toggleMute()}
              >
                {prefs.muted ? "Unmute" : "Mute all"}
              </button>
            </div>
            <label className="mb-2 block text-xs text-[color:var(--purple-dark)]">
              Music
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={prefs.bgmVolume}
                disabled={prefs.muted}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBgmVolume(v);
                  if (v > 0 && prefs.muted) setMuted(false);
                }}
                className="mt-1 w-full"
              />
            </label>
            <label className="mb-2 block text-xs text-[color:var(--purple-dark)]">
              Sounds
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={prefs.sfxVolume}
                disabled={prefs.muted || !prefs.sfxEnabled}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSfxVolume(v);
                  if (v > 0 && prefs.muted) setMuted(false);
                }}
                className="mt-1 w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[color:var(--purple-dark)]">
              <input
                type="checkbox"
                checked={prefs.sfxEnabled}
                onChange={(e) => setSfxEnabled(e.target.checked)}
              />
              UI sounds
            </label>
          </div>
        )}
      </div>
    </nav>
  );
}
