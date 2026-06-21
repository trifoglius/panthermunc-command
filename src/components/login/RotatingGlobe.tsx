"use client";

import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import type { HeaderGlobeFlashKind } from "@/context/HeaderGlobeFlashContext";
import {
  CONTINENT_DOTS,
  CONTINENT_OUTLINES,
  isLandPoint,
  MERIDIAN_COUNT,
  PARALLELS,
} from "@/components/login/globe-continents";
import {
  GLOBE_CENTER,
  GLOBE_RADIUS,
  GLOBE_VIEW_SIZE,
  continentOutlinePath,
  meridianPath,
  northPoleViewBoxY,
  parallelPath,
  projectPoint,
} from "@/components/login/globe-projection";

const SPIN_MS = 52_000;
const HEADER_MERIDIAN_COUNT = 6;
const HEADER_PARALLELS = [-45, 45] as const;
const SUSTAINED_PULSE_MS = 2800;

type GlobeFrame = {
  outline: SVGPathElement;
  meridians: SVGPathElement[];
  parallels: SVGPathElement[];
  dots: SVGCircleElement[];
  continents: SVGPathElement[];
  rim: SVGCircleElement;
};

function sustainedPulsePhase(now: number) {
  return 0.5 + 0.5 * Math.sin((now / SUSTAINED_PULSE_MS) * 2 * Math.PI);
}

function applySustainedNotificationStroke(frame: GlobeFrame, phase: number) {
  const gridAlpha = 0.72 + 0.28 * phase;
  const gridWidth = 0.52 + 0.16 * phase;
  const gridStroke = `rgba(96, 165, 250, ${gridAlpha.toFixed(3)})`;

  for (const path of frame.meridians) {
    path.style.stroke = gridStroke;
    path.style.strokeWidth = gridWidth.toFixed(3);
  }
  for (const path of frame.parallels) {
    path.style.stroke = gridStroke;
    path.style.strokeWidth = gridWidth.toFixed(3);
  }

  const outlineAlpha = 0.68 + 0.3 * phase;
  frame.outline.style.stroke = `rgba(96, 165, 250, ${outlineAlpha.toFixed(3)})`;
  frame.outline.style.strokeWidth = (0.5 + 0.14 * phase).toFixed(3);

  const rimAlpha = 0.78 + 0.22 * phase;
  frame.rim.style.stroke = `rgba(59, 130, 246, ${rimAlpha.toFixed(3)})`;
  frame.rim.style.strokeWidth = (0.54 + 0.18 * phase).toFixed(3);

  const continentAlpha = 0.82 + 0.18 * phase;
  for (const path of frame.continents) {
    path.style.stroke = `rgba(96, 165, 250, ${continentAlpha.toFixed(3)})`;
    path.style.strokeWidth = (0.48 + 0.1 * phase).toFixed(3);
  }
}

function clearSustainedStroke(frame: GlobeFrame) {
  for (const path of [
    ...frame.meridians,
    ...frame.parallels,
    frame.outline,
    ...frame.continents,
  ]) {
    path.style.stroke = "";
    path.style.strokeWidth = "";
  }
  frame.rim.style.stroke = "";
  frame.rim.style.strokeWidth = "";
}

const SVG_NS = "http://www.w3.org/2000/svg";

const FLASH_CLASSES = [
  "globe-flash-pass",
  "globe-flash-fail",
  "globe-flash-notification",
  "globe-flash-timer",
] as const;

function sustainedClassFor(kind: HeaderGlobeFlashKind | null | undefined) {
  switch (kind) {
    case "pass":
      return "globe-sustained-pass";
    case "fail":
      return "globe-sustained-fail";
    case "notification":
      return "globe-sustained-notification";
    case "timer":
      return "globe-sustained-timer";
    default:
      return "";
  }
}

function flashClassFor(kind: HeaderGlobeFlashKind | null | undefined) {
  switch (kind) {
    case "pass":
      return "globe-flash-pass";
    case "fail":
      return "globe-flash-fail";
    case "notification":
      return "globe-flash-notification";
    case "timer":
      return "globe-flash-timer";
    default:
      return "";
  }
}

const POLE_TOP_MARGIN = 24;

function applyGlobeMetrics(el: HTMLElement) {
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const size = Math.min((145 * vmin) / 100, 1180);
  const poleFraction = northPoleViewBoxY() / GLOBE_VIEW_SIZE;
  const bottom =
    POLE_TOP_MARGIN +
    window.innerHeight -
    size * (1 - poleFraction);

  el.style.setProperty("--globe-size", `${size}px`);
  el.style.setProperty("--globe-bottom", `${bottom}px`);
  el.style.setProperty("--globe-left", `${-0.36 * window.innerWidth}px`);
}

function createPath(
  svg: SVGSVGElement,
  className: string
): SVGPathElement {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("class", className);
  path.setAttribute("fill", "none");
  svg.appendChild(path);
  return path;
}

function createDot(
  svg: SVGSVGElement,
  index: number,
  radius = "0.42"
): SVGCircleElement {
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("class", "globe-dot");
  dot.setAttribute("r", radius);
  dot.style.animationDelay = `${((index * 0.17) % 6.8).toFixed(2)}s`;
  dot.style.animationDuration = `${4.2 + (index % 7) * 0.45}s`;
  svg.appendChild(dot);
  return dot;
}

type RotatingGlobeProps = {
  variant?: "login" | "header";
  flash?: HeaderGlobeFlashKind;
  /** Bumps when a flash is re-triggered so CSS animation restarts without remounting. */
  flashKey?: number;
  sustainedFlash?: HeaderGlobeFlashKind;
  size?: number;
};

export function RotatingGlobe({
  variant = "login",
  flash = null,
  flashKey = 0,
  sustainedFlash = null,
  size = 42,
}: RotatingGlobeProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<GlobeFrame | null>(null);
  const sustainedFlashRef = useRef<HeaderGlobeFlashKind>(sustainedFlash);
  const reducedMotionRef = useRef(false);

  sustainedFlashRef.current = sustainedFlash;

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  useLayoutEffect(() => {
    if (variant === "header") return;

    const el = sceneRef.current;
    if (!el) return;

    applyGlobeMetrics(el);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleUpdate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => applyGlobeMetrics(el), 200);
    };
    const onFullscreenChange = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => applyGlobeMetrics(el));
      });
    };

    window.addEventListener("resize", scheduleUpdate);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("resize", scheduleUpdate);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [variant]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || frameRef.current) return;

    const isHeader = variant === "header";
    const meridianCount = isHeader ? HEADER_MERIDIAN_COUNT : MERIDIAN_COUNT;
    const parallelLats = isHeader
      ? [...HEADER_PARALLELS]
      : PARALLELS.filter((lat) => lat !== 0);

    const outline = createPath(svg, "globe-outline");
    const meridians = Array.from({ length: meridianCount }, () =>
      createPath(svg, "globe-meridian")
    );
    const parallels = parallelLats.map(() => createPath(svg, "globe-parallel"));
    const dots = isHeader
      ? []
      : CONTINENT_DOTS.map((_, i) => createDot(svg, i, "0.42"));
    const continents = isHeader
      ? CONTINENT_OUTLINES.map(() => createPath(svg, "globe-continent"))
      : [];

    const rim = document.createElementNS(SVG_NS, "circle");
    rim.setAttribute("class", "globe-rim");
    rim.setAttribute("cx", String(GLOBE_CENTER));
    rim.setAttribute("cy", String(GLOBE_CENTER));
    rim.setAttribute("r", String(GLOBE_RADIUS));
    rim.setAttribute("fill", "none");
    svg.appendChild(rim);

    frameRef.current = { outline, meridians, parallels, dots, continents, rim };

    const start = performance.now();
    let raf = 0;
    let hadSustainedStroke = false;

    const render = (now: number) => {
      const frame = frameRef.current;
      if (!frame) return;

      const rotY = (((now - start) % SPIN_MS) / SPIN_MS) * 360;
      const landClip = isHeader ? isLandPoint : undefined;

      frame.outline.setAttribute("d", parallelPath(0, rotY, landClip));

      frame.meridians.forEach((path, i) => {
        const lon = i * (180 / meridianCount);
        path.setAttribute("d", meridianPath(lon, rotY, landClip));
      });

      frame.parallels.forEach((path, i) => {
        path.setAttribute("d", parallelPath(parallelLats[i], rotY, landClip));
      });

      if (isHeader) {
        frame.continents.forEach((path, i) => {
          path.setAttribute("d", continentOutlinePath(CONTINENT_OUTLINES[i], rotY));
        });

        const sustained = sustainedFlashRef.current;
        if (sustained === "notification") {
          const phase = reducedMotionRef.current ? 1 : sustainedPulsePhase(now);
          applySustainedNotificationStroke(frame, phase);
          hadSustainedStroke = true;
        } else if (hadSustainedStroke) {
          clearSustainedStroke(frame);
          hadSustainedStroke = false;
        }
      } else {
        frame.dots.forEach((dot, i) => {
          const [lat, lon] = CONTINENT_DOTS[i];
          const [x, y] = projectPoint(lat, lon, rotY);
          dot.setAttribute("cx", x.toFixed(2));
          dot.setAttribute("cy", y.toFixed(2));
        });
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      frameRef.current = null;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
    };
  }, [variant]);

  useEffect(() => {
    if (variant !== "header" || !flash) return;

    const el = sceneRef.current;
    if (!el) return;

    const activeClass = flashClassFor(flash);
    for (const cls of FLASH_CLASSES) {
      el.classList.remove(cls);
    }
    void el.offsetWidth;
    el.classList.add(activeClass);
  }, [variant, flash, flashKey]);

  const sceneClass =
    variant === "header"
      ? "header-globe-scene header-globe-theme"
      : "globe-scene";
  const flashClass = flashClassFor(flash);
  const sustainedClass = sustainedClassFor(sustainedFlash);

  const headerStyle: CSSProperties | undefined =
    variant === "header"
      ? { width: size, height: size, flexShrink: 0 }
      : undefined;

  return (
    <div
      className={`${sceneClass} ${flashClass} ${sustainedClass}`.trim()}
      ref={sceneRef}
      style={headerStyle}
      aria-hidden
    >
      <svg
        ref={svgRef}
        className="globe-svg"
        viewBox={`0 0 ${GLOBE_VIEW_SIZE} ${GLOBE_VIEW_SIZE}`}
      >
        <circle
          className="globe-hit-area"
          cx={GLOBE_CENTER}
          cy={GLOBE_CENTER}
          r={GLOBE_RADIUS}
        />
      </svg>
    </div>
  );
}
