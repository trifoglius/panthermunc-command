"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHeaderGlobeFlash } from "@/context/HeaderGlobeFlashContext";
import { playAlarmSound, unlockAlarmSound } from "@/lib/alarm-sound";
import {
  onTimerStartWarning,
  TIMER_WARNING_SECONDS,
} from "@/lib/timer-flash";

export type TimerMode = "none" | "total" | "speaking";

export function useSessionTimers(
  totalInitial: number,
  speakingInitial: number
) {
  const { triggerFlash } = useHeaderGlobeFlash();
  const [totalSeconds, setTotalSeconds] = useState(totalInitial);
  const [speakingSeconds, setSpeakingSeconds] = useState(speakingInitial);
  const [mode, setMode] = useState<TimerMode>("none");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalRef = useRef(totalSeconds);
  const speakingRef = useRef(speakingSeconds);

  totalRef.current = totalSeconds;
  speakingRef.current = speakingSeconds;

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
      totalRef.current = value;
      setTotalSeconds(value);
    },
    [totalInitial]
  );

  const resetSpeaking = useCallback(
    (value = speakingInitial) => {
      speakingRef.current = value;
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
    onTimerStartWarning(totalRef.current, triggerFlash);
    setMode("total");
  }, [triggerFlash]);

  const startSpeaking = useCallback(() => {
    unlockAlarmSound();
    onTimerStartWarning(speakingRef.current, triggerFlash);
    setMode("speaking");
  }, [triggerFlash]);

  useEffect(() => {
    clear();
    if (mode === "none") return;

    intervalRef.current = setInterval(() => {
      let shouldFlash = false;
      let shouldAlarm = false;

      if ((mode === "total" || mode === "speaking") && totalInitial > 0) {
        const current = totalRef.current;
        const next = Math.max(0, current - 1);
        if (current > 0 && next <= TIMER_WARNING_SECONDS) shouldFlash = true;
        if (next === 0 && current > 0) shouldAlarm = true;
        totalRef.current = next;
        setTotalSeconds(next);
        if (next === 0) {
          clear();
          setMode("none");
        }
      }

      if (mode === "speaking") {
        const current = speakingRef.current;
        const next = Math.max(0, current - 1);
        if (current > 0 && next <= TIMER_WARNING_SECONDS) shouldFlash = true;
        if (next === 0 && current > 0) shouldAlarm = true;
        speakingRef.current = next;
        setSpeakingSeconds(next);
        if (next === 0) {
          clear();
          setMode("none");
        }
      }

      if (shouldFlash) triggerFlash("timer");
      if (shouldAlarm) playAlarmSound();
    }, 1000);

    return clear;
  }, [mode, clear, totalInitial, triggerFlash]);

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
