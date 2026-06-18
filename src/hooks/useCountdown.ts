"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playAlarmSound, unlockAlarmSound } from "@/lib/alarm-sound";

export function useCountdown(initialSeconds: number) {
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
    setRunning(true);
  }, []);
  const pause = useCallback(() => setRunning(false), []);

  useEffect(() => {
    if (!running) {
      clear();
      return;
    }

    intervalRef.current = setInterval(() => {
      const current = secondsRef.current;
      if (current <= 1) {
        clear();
        setRunning(false);
        secondsRef.current = 0;
        setSeconds(0);
        if (current > 0) {
          playAlarmSound();
        }
        return;
      }

      const next = current - 1;
      secondsRef.current = next;
      setSeconds(next);
    }, 1000);

    return clear;
  }, [running, clear]);

  return { seconds, running, start, pause, reset, setRunning };
}
