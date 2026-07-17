"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useUiAudio } from "@/components/UiAudioProvider";
import {
  GlyphAudio,
  GlyphMuted,
} from "@/components/home/HomeGlyphs";

export function WorldHud({
  title,
  subtitle,
  hint = "Drag cubes to rearrange · Click to open · Pan to look around",
  onBack,
  backLabel = "← Back",
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  hint?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
}) {
  const {
    prefs,
    toggleMute,
    setBgmVolume,
    setSfxVolume,
    setSfxEnabled,
    setMuted,
  } = useUiAudio();
  const [audioOpen, setAudioOpen] = useState(false);

  useEffect(() => {
    if (!audioOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAudioOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [audioOpen]);

  return (
    <div className="world-hud pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-6">
      <div className="pointer-events-auto max-w-xl">
        <div className="world-hud-bubble">
          {onBack && (
            <button
              type="button"
              className="mb-2 rounded-lg px-2 py-1 text-sm font-medium text-[color:var(--purple-dark)] hover:bg-white/40"
              onClick={onBack}
            >
              {backLabel}
            </button>
          )}
          <div className="world-hud-title">{title}</div>
          {subtitle}
          <p className="mt-1 text-xs text-[color:var(--purple-primary)] opacity-80">
            {hint}
          </p>
          {actions && (
            <div className="mt-3 flex flex-wrap gap-2 pointer-events-auto">
              {actions}
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-auto relative self-end">
        <button
          type="button"
          className={`dock-item ${prefs.muted ? "dock-item-slate" : "dock-item-rose"}`}
          aria-label={prefs.muted ? "Unmute audio" : "Audio settings"}
          aria-expanded={audioOpen}
          onClick={() => setAudioOpen((v) => !v)}
          title={prefs.muted ? "Muted" : "Audio"}
        >
          {prefs.muted ? <GlyphMuted /> : <GlyphAudio />}
        </button>
        {audioOpen && (
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
    </div>
  );
}
