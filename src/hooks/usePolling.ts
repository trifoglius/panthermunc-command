"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Runs `fn` immediately and then on `intervalMs`, pausing whenever the tab
 * is hidden (document.visibilityState === "hidden"). Stops when `enabled`
 * is false or the component unmounts.
 */
export function usePolling(
  fn: () => void,
  intervalMs: number,
  enabled: boolean
): void {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(() => fnRef.current(), []);

  useEffect(() => {
    if (!enabled) return;

    run();
    const interval = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        run();
      }
    }, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        run();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs, run]);
}
