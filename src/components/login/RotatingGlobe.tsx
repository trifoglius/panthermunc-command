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
  parallelPath,
  projectPoint,
} from "@/components/login/globe-projection";

const SPIN_MS = 52_000;
const HEADER_MERIDIAN_COUNT = 6;
const HEADER_PARALLELS = [-45, 45] as const;

const SVG_NS = "http://www.w3.org/2000/svg";

const FLASH_CLASSES = [
  "globe-flash-pass",
  "globe-flash-fail",
  "globe-flash-notification",
  "globe-flash-timer",
] as const;

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

function applyGlobeMetrics(el: HTMLElement) {
  const vmin = Math.min(window.innerWidth, window.innerHeight);
  const size = Math.min((145 * vmin) / 100, 1180);
  el.style.setProperty("--globe-size", `${size}px`);
  el.style.setProperty("--globe-bottom", `${-0.55 * window.innerHeight}px`);
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

function createDot(svg: SVGSVGElement, radius = "0.42"): SVGCircleElement {
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("class", "globe-dot");
  dot.setAttribute("r", radius);
  svg.appendChild(dot);
  return dot;
}

type RotatingGlobeProps = {
  variant?: "login" | "header";
  flash?: HeaderGlobeFlashKind;
  /** Bumps when a flash is re-triggered so CSS animation restarts without remounting. */
  flashKey?: number;
  size?: number;
};

export function RotatingGlobe({
  variant = "login",
  flash = null,
  flashKey = 0,
  size = 42,
}: RotatingGlobeProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<{
    outline: SVGPathElement;
    meridians: SVGPathElement[];
    parallels: SVGPathElement[];
    dots: SVGCircleElement[];
    continents: SVGPathElement[];
  } | null>(null);

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
      : CONTINENT_DOTS.map(() => createDot(svg, "0.42"));
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

    frameRef.current = { outline, meridians, parallels, dots, continents };

    const start = performance.now();
    let raf = 0;

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

  const headerStyle: CSSProperties | undefined =
    variant === "header"
      ? { width: size, height: size, flexShrink: 0 }
      : undefined;

  return (
    <div
      className={`${sceneClass} ${flashClass}`.trim()}
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
