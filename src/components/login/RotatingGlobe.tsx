"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  CONTINENT_DOTS,
  MERIDIAN_COUNT,
  PARALLELS,
} from "@/components/login/globe-continents";
import {
  GLOBE_CENTER,
  GLOBE_RADIUS,
  GLOBE_VIEW_SIZE,
  meridianPath,
  parallelPath,
  projectPoint,
} from "@/components/login/globe-projection";

const SPIN_MS = 52_000;

const SVG_NS = "http://www.w3.org/2000/svg";

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

function createDot(svg: SVGSVGElement): SVGCircleElement {
  const dot = document.createElementNS(SVG_NS, "circle");
  dot.setAttribute("class", "globe-dot");
  dot.setAttribute("r", "0.42");
  svg.appendChild(dot);
  return dot;
}

export function RotatingGlobe() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef<{
    outline: SVGPathElement;
    meridians: SVGPathElement[];
    parallels: SVGPathElement[];
    dots: SVGCircleElement[];
  } | null>(null);

  useLayoutEffect(() => {
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
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || frameRef.current) return;

    const outline = createPath(svg, "globe-outline");
    const meridians = Array.from({ length: MERIDIAN_COUNT }, () =>
      createPath(svg, "globe-meridian")
    );
    const parallels = PARALLELS.filter((lat) => lat !== 0).map(() =>
      createPath(svg, "globe-parallel")
    );
    const dots = CONTINENT_DOTS.map(() => createDot(svg));

    frameRef.current = { outline, meridians, parallels, dots };

    const parallelLats = PARALLELS.filter((lat) => lat !== 0);
    const start = performance.now();
    let raf = 0;

    const render = (now: number) => {
      const frame = frameRef.current;
      if (!frame) return;

      const rotY = (((now - start) % SPIN_MS) / SPIN_MS) * 360;

      frame.outline.setAttribute("d", parallelPath(0, rotY));

      frame.meridians.forEach((path, i) => {
        const lon = i * (180 / MERIDIAN_COUNT);
        path.setAttribute("d", meridianPath(lon, rotY));
      });

      frame.parallels.forEach((path, i) => {
        path.setAttribute("d", parallelPath(parallelLats[i], rotY));
      });

      frame.dots.forEach((dot, i) => {
        const [lat, lon] = CONTINENT_DOTS[i];
        const [x, y] = projectPoint(lat, lon, rotY);
        dot.setAttribute("cx", x.toFixed(2));
        dot.setAttribute("cy", y.toFixed(2));
      });

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      frameRef.current = null;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
    };
  }, []);

  return (
    <div className="globe-scene" ref={sceneRef} aria-hidden>
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
