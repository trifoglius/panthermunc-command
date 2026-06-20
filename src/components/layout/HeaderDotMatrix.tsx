"use client";

import { useEffect, useRef } from "react";
import {
  useHeaderGlobeFlash,
  type HeaderGlobeFlashKind,
} from "@/context/HeaderGlobeFlashContext";

const DOT_SPACING = 4;
const DOT_SIZE = 0.95;
const EVENT_PULSE_MS = 1100;
const EVENT_BOOST_MAX = 0.58;
/** Base flash gate; each dot gets a small offset so the flash front isn't a straight line. */
const FLASH_CYCLE_THRESHOLD = 0.58;
const FLASH_THRESHOLD_SPREAD = 0.26;
const WAVE_SPEED = 0.85;
/** Primary diagonal wave (px⁻¹). Lower = longer wavelength. */
const WAVE_X = 0.011;
const WAVE_Y = 0.008;
/** Extra px around the header globe where dots stay unlit. */
const GLOBE_EXCLUSION_PADDING = 8;
const GLOBE_ZONE_MIN_OPACITY = 0.03;

/** Peak flash colors — match globe grid strokes in globals.css. */
const FLASH_COLORS: Record<
  Exclude<HeaderGlobeFlashKind, null>,
  readonly [number, number, number]
> = {
  pass: [74, 222, 128],
  fail: [248, 113, 113],
  notification: [96, 165, 250],
  timer: [250, 204, 21],
};

type Dot = {
  x: number;
  y: number;
  flashThreshold: number;
};

type GlobeZone = {
  cx: number;
  cy: number;
  radius: number;
};

function dotSeed(col: number, row: number) {
  const n = Math.sin(col * 12.9898 + row * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function getGlobeExclusionZone(canvasParent: HTMLElement): GlobeZone | null {
  const header = canvasParent.parentElement;
  if (!header) return null;

  const globe = header.querySelector<HTMLElement>(".header-globe-scene");
  if (!globe) return null;

  const parentRect = canvasParent.getBoundingClientRect();
  const globeRect = globe.getBoundingClientRect();

  return {
    cx: globeRect.left + globeRect.width / 2 - parentRect.left,
    cy: globeRect.top + globeRect.height / 2 - parentRect.top,
    radius: Math.max(globeRect.width, globeRect.height) / 2 + GLOBE_EXCLUSION_PADDING,
  };
}

function isInGlobeZone(dot: Dot, zone: GlobeZone) {
  const dx = dot.x - zone.cx;
  const dy = dot.y - zone.cy;
  return dx * dx + dy * dy <= zone.radius * zone.radius;
}

function ambientOpacity(cycle: number) {
  const eased = cycle * cycle * (3 - 2 * cycle);
  return 0.03 + 0.58 * eased;
}

export function HeaderDotMatrix() {
  const { flash, flashKey } = useHeaderGlobeFlash();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef(0);
  const eventPulseStartRef = useRef<number | null>(null);
  const eventFlashKindRef = useRef<Exclude<HeaderGlobeFlashKind, null> | null>(
    null
  );

  useEffect(() => {
    if (!flash) return;
    eventPulseStartRef.current = performance.now();
    eventFlashKindRef.current = flash;
  }, [flash, flashKey]);

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
            flashThreshold:
              FLASH_CYCLE_THRESHOLD +
              (dotSeed(col, row) - 0.5) * FLASH_THRESHOLD_SPREAD,
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
          eventFlashKindRef.current = null;
        }
      }

      const flashKind = eventFlashKindRef.current;

      const t = now * 0.001;
      const globeZone = getGlobeExclusionZone(parent);
      for (const dot of dotsRef.current) {
        if (globeZone && isInGlobeZone(dot, globeZone)) {
          const half = DOT_SIZE / 2;
          ctx.fillStyle = `rgba(255, 255, 255, ${GLOBE_ZONE_MIN_OPACITY})`;
          ctx.fillRect(dot.x - half, dot.y - half, DOT_SIZE, DOT_SIZE);
          continue;
        }

        const cycle =
          0.5 +
          0.5 * Math.sin(t * WAVE_SPEED - dot.x * WAVE_X - dot.y * WAVE_Y);
        const ambient = reducedMotion ? 0.18 : ambientOpacity(cycle);

        const qualifiesForFlash =
          eventBoost > 0 &&
          (reducedMotion || cycle >= dot.flashThreshold);
        const dotBoost = qualifiesForFlash ? eventBoost : 0;

        const pulse = Math.min(0.96, ambient + dotBoost);
        const size = DOT_SIZE + cycle * 0.55 + dotBoost * 1.5;
        const half = size / 2;

        if (dotBoost > 0 && flashKind) {
          const [r, g, b] = FLASH_COLORS[flashKind];
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulse})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        }

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
