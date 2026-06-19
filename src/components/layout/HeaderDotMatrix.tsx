"use client";

import { useEffect, useRef } from "react";
import { useHeaderGlobeFlash } from "@/context/HeaderGlobeFlashContext";

const DOT_SPACING = 14;
const DOT_SIZE = 1.75;
const EVENT_PULSE_MS = 1100;
const EVENT_BOOST_MAX = 0.36;
/** Normalized ambient cycle (0–1); only dots above this join the event flash. */
const FLASH_CYCLE_THRESHOLD = 0.62;

type Dot = {
  x: number;
  y: number;
  phase: number;
  speed: number;
};

function ambientOpacity(cycle: number) {
  return 0.05 + 0.3 * cycle;
}

export function HeaderDotMatrix() {
  const { flash } = useHeaderGlobeFlash();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef(0);
  const eventPulseStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!flash) return;
    eventPulseStartRef.current = performance.now();
  }, [flash]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.ceil(width / DOT_SPACING) + 1;
      const rows = Math.ceil(height / DOT_SPACING) + 1;
      const dots: Dot[] = [];

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          dots.push({
            x: col * DOT_SPACING + (row % 2 === 0 ? 0 : DOT_SPACING / 2),
            y: row * DOT_SPACING,
            phase: Math.random() * Math.PI * 2,
            speed: 0.35 + Math.random() * 0.55,
          });
        }
      }

      dotsRef.current = dots;
    };

    const draw = (now: number) => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = parent.clientWidth;
      const height = parent.clientHeight;
      ctx.clearRect(0, 0, width, height);

      let eventBoost = 0;
      if (eventPulseStartRef.current !== null) {
        const elapsed = now - eventPulseStartRef.current;
        if (elapsed < EVENT_PULSE_MS) {
          const t = elapsed / EVENT_PULSE_MS;
          eventBoost = Math.sin(Math.PI * t) * EVENT_BOOST_MAX;
        } else {
          eventPulseStartRef.current = null;
        }
      }

      const t = now * 0.001;
      for (const dot of dotsRef.current) {
        const cycle = 0.5 + 0.5 * Math.sin(t * dot.speed + dot.phase);
        const ambient = reducedMotion ? 0.18 : ambientOpacity(cycle);

        const qualifiesForFlash =
          eventBoost > 0 &&
          (reducedMotion || cycle >= FLASH_CYCLE_THRESHOLD);
        const dotBoost = qualifiesForFlash ? eventBoost : 0;

        const pulse = Math.min(0.82, ambient + dotBoost);
        const size = DOT_SIZE + dotBoost * 1.1;
        const half = size / 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.fillRect(dot.x - half, dot.y - half, size, size);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    resize();
    rafRef.current = requestAnimationFrame(draw);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="header-dot-matrix" aria-hidden />;
}
