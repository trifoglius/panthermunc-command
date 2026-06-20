"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHeaderGlobeFlash } from "@/context/HeaderGlobeFlashContext";
import { playAlarmSound, unlockAlarmSound } from "@/lib/alarm-sound";
import {
  onTimerStartWarning,
  onTimerTickWarning,
} from "@/lib/timer-flash";

export function useCountdown(initialSeconds: number) {
  const { triggerFlash } = useHeaderGlobeFlash();
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(seconds);

  secondsRef.current = seconds;

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(
    (value: number) => {
      clear();
      secondsRef.current = value;
      setSeconds(value);
      setRunning(false);
    },
    [clear]
  );

  const start = useCallback(() => {
    unlockAlarmSound();
    onTimerStartWarning(secondsRef.current, triggerFlash);
    setRunning(true);
  }, [triggerFlash]);
  const pause = useCallback(() => setRunning(false), []);

  useEffect(() => {
    if (!running) {
      clear();
      return;
    }

    intervalRef.current = setInterval(() => {
      const current = secondsRef.current;
      if (current <= 0) return;

      const next = current - 1;
      secondsRef.current = next;
      setSeconds(next);

      onTimerTickWarning(current, next, triggerFlash);

      if (next === 0) {
        clear();
        setRunning(false);
        playAlarmSound();
      }
    }, 1000);

    return clear;
  }, [running, clear, triggerFlash]);

  return { seconds, running, start, pause, reset, setRunning };
}
