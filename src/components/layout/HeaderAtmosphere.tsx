"use client";

import { useEffect, useRef } from "react";
import {
  useHeaderGlobeFlash,
  type HeaderGlobeFlashKind,
} from "@/context/HeaderGlobeFlashContext";
import { useTheme } from "@/context/ThemeContext";
import type { ThemeId } from "@/lib/theme";
import { HeaderDotMatrix } from "@/components/layout/HeaderDotMatrix";

const FLASH_COLORS: Record<
  Exclude<HeaderGlobeFlashKind, null>,
  readonly [number, number, number]
> = {
  pass: [74, 222, 128],
  fail: [248, 113, 113],
  notification: [96, 165, 250],
  timer: [250, 204, 21],
};

const EVENT_PULSE_MS = 1100;

function eventBoostAt(now: number, pulseStart: number | null, sustained: boolean) {
  if (sustained) {
    const t = (now % EVENT_PULSE_MS) / EVENT_PULSE_MS;
    return Math.sin(Math.PI * t) * 0.85;
  }
  if (pulseStart === null) return 0;
  const elapsed = now - pulseStart;
  if (elapsed >= EVENT_PULSE_MS) return 0;
  return Math.sin(Math.PI * (elapsed / EVENT_PULSE_MS)) * 0.85;
}

function useFlashBoosts(
  flash: HeaderGlobeFlashKind,
  flashKey: number,
  sustainedFlash: HeaderGlobeFlashKind
) {
  const eventPulseStartRef = useRef<number | null>(null);
  const eventFlashKindRef = useRef<Exclude<HeaderGlobeFlashKind, null> | null>(
    null
  );
  const sustainedFlashKindRef = useRef<HeaderGlobeFlashKind>(null);
  sustainedFlashKindRef.current = sustainedFlash;

  useEffect(() => {
    if (!flash) return;
    eventPulseStartRef.current = performance.now();
    eventFlashKindRef.current = flash;
  }, [flash, flashKey]);

  return { eventPulseStartRef, eventFlashKindRef, sustainedFlashKindRef };
}

function useHeaderCanvas(
  drawFrame: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    now: number
  ) => void
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(drawFrame);
  drawRef.current = drawFrame;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
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
    };

    const draw = (now: number) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      ctx.clearRect(0, 0, width, height);
      drawRef.current(ctx, width, height, reducedMotion ? 0 : now);
      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return canvasRef;
}

/** Soft cyan / white air ribbons for Home Menu (Frutiger Aero). */
function HeaderHomeAir() {
  const { flash, flashKey, sustainedFlash } = useHeaderGlobeFlash();
  const { eventPulseStartRef, eventFlashKindRef, sustainedFlashKindRef } =
    useFlashBoosts(flash, flashKey, sustainedFlash);

  const canvasRef = useHeaderCanvas((ctx, width, height, now) => {
    let eventBoost = 0;
    let flashKind = eventFlashKindRef.current;
    const sustainedKind = sustainedFlashKindRef.current;

    if (sustainedKind) {
      eventBoost = eventBoostAt(now || performance.now(), null, true);
      flashKind = sustainedKind;
    } else if (eventPulseStartRef.current !== null) {
      eventBoost = eventBoostAt(
        now || performance.now(),
        eventPulseStartRef.current,
        false
      );
      if (eventBoost === 0) {
        eventPulseStartRef.current = null;
        eventFlashKindRef.current = null;
        flashKind = null;
      }
    }

    const t = (now || 0) * 0.001;
    const lineCount = Math.max(5, Math.floor(height / 11));
    const [fr, fg, fb] = flashKind
      ? FLASH_COLORS[flashKind]
      : ([120, 200, 230] as const);

    for (let i = 0; i < lineCount; i += 1) {
      const baseY =
        ((i / lineCount) * height + t * (8 + (i % 3) * 3)) % (height + 20) - 10;
      const amp = 4 + (i % 4) * 1.8;
      const freq = 0.01 + (i % 5) * 0.0012;
      const phase = t * (0.85 + i * 0.05) + i * 0.7;

      const ambient = 0.22 + 0.12 * Math.sin(t * 0.7 + i);
      const alpha = Math.min(0.75, ambient + eventBoost * (0.3 + (i % 3) * 0.06));

      ctx.beginPath();
      for (let x = 0; x <= width; x += 5) {
        const y =
          baseY +
          Math.sin(x * freq + phase) * amp +
          Math.sin(x * freq * 0.4 + phase * 1.2) * (amp * 0.3);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
      grad.addColorStop(0.2, `rgba(255, 255, 255, ${alpha * 0.5})`);
      grad.addColorStop(0.5, `rgba(220, 240, 255, ${alpha})`);
      grad.addColorStop(0.8, `rgba(${fr}, ${fg}, ${fb}, ${alpha * 0.45})`);
      grad.addColorStop(1, `rgba(${fr}, ${fg}, ${fb}, 0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.1 + eventBoost * 1.2 + (i % 2) * 0.35;
      ctx.stroke();
    }

    // Soft floating orbs
    for (let i = 0; i < 4; i += 1) {
      const x =
        ((width * (0.15 + i * 0.22) + Math.sin(t * 0.4 + i) * 50) %
          (width + 60)) -
        30;
      const y = height * (0.25 + (i % 3) * 0.2) + Math.cos(t * 0.35 + i) * 8;
      const r = 10 + (i % 3) * 6 + eventBoost * 4;
      const orb = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.12 + eventBoost * 0.12;
      orb.addColorStop(0, `rgba(255, 255, 255, ${a})`);
      orb.addColorStop(0.6, `rgba(${fr}, ${fg}, ${fb}, ${a * 0.35})`);
      orb.addColorStop(1, `rgba(255, 255, 255, 0)`);
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return <canvas ref={canvasRef} className="header-atmosphere" aria-hidden />;
}

/** Brass edge pulse for Classy — no dot matrix. */
function HeaderEdgePulse() {
  const { flash, flashKey, sustainedFlash } = useHeaderGlobeFlash();
  const { eventPulseStartRef, eventFlashKindRef, sustainedFlashKindRef } =
    useFlashBoosts(flash, flashKey, sustainedFlash);

  const canvasRef = useHeaderCanvas((ctx, width, height, now) => {
    let eventBoost = 0;
    let flashKind = eventFlashKindRef.current;
    const sustainedKind = sustainedFlashKindRef.current;
    const clock = now || performance.now();

    if (sustainedKind) {
      eventBoost = eventBoostAt(clock, null, true);
      flashKind = sustainedKind;
    } else if (eventPulseStartRef.current !== null) {
      eventBoost = eventBoostAt(clock, eventPulseStartRef.current, false);
      if (eventBoost === 0) {
        eventPulseStartRef.current = null;
        eventFlashKindRef.current = null;
        flashKind = null;
      }
    }

    const t = clock * 0.001;
    const ambient = 0.08 + 0.03 * Math.sin(t * 1.1);
    const strength = ambient + eventBoost * 0.35;
    const [r, g, b] = flashKind ? FLASH_COLORS[flashKind] : ([154, 123, 69] as const);

    const edge = Math.max(10, Math.min(width, height) * 0.12);
    const pulseReach = edge * (0.75 + eventBoost * 0.45 + 0.06 * Math.sin(t * 1.6));

    const paintEdge = (
      gradient: CanvasGradient,
      fade: number
    ) => {
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${strength * fade})`);
      gradient.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${strength * fade * 0.22})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    };

    // Top
    {
      const g = ctx.createLinearGradient(0, 0, 0, pulseReach);
      paintEdge(g, 1);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, pulseReach);
    }
    // Bottom
    {
      const g = ctx.createLinearGradient(0, height, 0, height - pulseReach);
      paintEdge(g, 1);
      ctx.fillStyle = g;
      ctx.fillRect(0, height - pulseReach, width, pulseReach);
    }
    // Left
    {
      const g = ctx.createLinearGradient(0, 0, pulseReach, 0);
      paintEdge(g, 0.7);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, pulseReach, height);
    }
    // Right
    {
      const g = ctx.createLinearGradient(width, 0, width - pulseReach, 0);
      paintEdge(g, 0.7);
      ctx.fillStyle = g;
      ctx.fillRect(width - pulseReach, 0, pulseReach, height);
    }

    // Thin brass rule highlights on the outer rim
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.18 + eventBoost * 0.28})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  });

  return <canvas ref={canvasRef} className="header-atmosphere" aria-hidden />;
}

export function HeaderAtmosphere() {
  const { theme } = useTheme();
  return <HeaderAtmosphereForTheme theme={theme} />;
}

function HeaderAtmosphereForTheme({ theme }: { theme: ThemeId }) {
  if (theme === "frutiger-aero") return <HeaderHomeAir key="aero" />;
  if (theme === "classy") return <HeaderEdgePulse key="classy" />;
  return <HeaderDotMatrix key="classic" />;
}
