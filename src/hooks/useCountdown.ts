"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(
    (value: number) => {
      clear();
      setSeconds(value);
      setRunning(false);
    },
    [clear]
  );

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);

  useEffect(() => {
    if (!running) {
      clear();
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clear();
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return clear;
  }, [running, clear]);

  return { seconds, running, start, pause, reset, setRunning };
}
