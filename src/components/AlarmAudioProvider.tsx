"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { setAlarmAudioElement, unlockAlarmSound } from "@/lib/alarm-sound";

export function AlarmAudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setAlarmAudioElement(audio);

    const unlock = () => unlockAlarmSound();

    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });

    return () => {
      setAlarmAudioElement(null);
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);

  return (
    <>
      {children}
      <audio
        ref={audioRef}
        src="/alarm_sound.wav"
        preload="auto"
        playsInline
        aria-hidden
      />
    </>
  );
}
