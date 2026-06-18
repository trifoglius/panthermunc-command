"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playAlarmSound, unlockAlarmSound } from "@/lib/alarm-sound";

export type TimerMode = "none" | "total" | "speaking";

export function useSessionTimers(
  totalInitial: number,
  speakingInitial: number
) {
  const [totalSeconds, setTotalSeconds] = useState(totalInitial);
  const [speakingSeconds, setSpeakingSeconds] = useState(speakingInitial);
  const [mode, setMode] = useState<TimerMode>("none");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clear();
    setMode("none");
  }, [clear]);

  const resetTotal = useCallback(
    (value = totalInitial) => {
      setTotalSeconds(value);
    },
    [totalInitial]
  );

  const resetSpeaking = useCallback(
    (value = speakingInitial) => {
      setSpeakingSeconds(value);
    },
    [speakingInitial]
  );

  const resetAll = useCallback(() => {
    stop();
    resetTotal();
    resetSpeaking();
  }, [stop, resetTotal, resetSpeaking]);

  const startTotal = useCallback(() => {
    unlockAlarmSound();
    setMode("total");
  }, []);

  const startSpeaking = useCallback(() => {
    unlockAlarmSound();
    setMode("speaking");
  }, []);

  useEffect(() => {
    clear();
    if (mode === "none") return;

    intervalRef.current = setInterval(() => {
      let expired = false;

      if ((mode === "total" || mode === "speaking") && totalInitial > 0) {
        setTotalSeconds((t) => {
          const next = Math.max(0, t - 1);
          if (next === 0 && t > 0) expired = true;
          if (next === 0) {
            clear();
            setMode("none");
          }
          return next;
        });
      }
      if (mode === "speaking") {
        setSpeakingSeconds((s) => {
          const next = Math.max(0, s - 1);
          if (next === 0 && s > 0) expired = true;
          if (next === 0) {
            clear();
            setMode("none");
          }
          return next;
        });
      }

      if (expired) playAlarmSound();
    }, 1000);

    return clear;
  }, [mode, clear, totalInitial]);

  return {
    totalSeconds,
    speakingSeconds,
    mode,
    startTotal,
    startSpeaking,
    pause: stop,
    resetSpeaking,
    resetTotal,
    resetAll,
    hasTotal: totalInitial > 0,
    hasSpeaking: speakingInitial > 0,
    speakingInitial,
    totalInitial,
  };
}

export type SessionTimers = ReturnType<typeof useSessionTimers>;
