"use client";

import { useEffect, useRef, useState } from "react";

const SHAPES = [
  { top: "6%", left: "4%", w: 88, h: 88, delay: "0s", kind: "squircle" as const },
  { top: "14%", left: "72%", w: 120, h: 120, delay: "1.5s", kind: "sphere" as const },
  { top: "58%", left: "8%", w: 72, h: 72, delay: "3s", kind: "soft" as const },
  { top: "68%", left: "68%", w: 140, h: 140, delay: "0.8s", kind: "cube" as const },
  { top: "36%", left: "42%", w: 56, h: 56, delay: "2.2s", kind: "sphere" as const },
  { top: "10%", left: "38%", w: 64, h: 64, delay: "4s", kind: "soft" as const },
  { top: "48%", left: "82%", w: 50, h: 50, delay: "2.8s", kind: "cube" as const },
  { top: "78%", left: "28%", w: 96, h: 96, delay: "1.2s", kind: "sphere" as const },
  { top: "22%", left: "18%", w: 44, h: 44, delay: "3.5s", kind: "soft" as const },
  { top: "85%", left: "55%", w: 70, h: 70, delay: "5s", kind: "squircle" as const },
  { top: "30%", left: "55%", w: 36, h: 36, delay: "1.8s", kind: "cube" as const },
  { top: "70%", left: "12%", w: 48, h: 48, delay: "4.4s", kind: "cube" as const },
];

export function HomeAtmosphere({
  parallax = true,
}: {
  parallax?: boolean;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!parallax || reduced) return;
    const layer = layerRef.current;
    if (!layer) return;

    const onMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 22;
      const y = (e.clientY / window.innerHeight - 0.5) * 16;
      layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallax, reduced]);

  return (
    <div className="home-atmosphere" aria-hidden>
      <div ref={layerRef} className="home-atmosphere-layer">
        {SHAPES.map((s, i) => (
          <div
            key={i}
            className={`home-atmosphere-shape is-${s.kind}`}
            style={{
              top: s.top,
              left: s.left,
              width: s.w,
              height: s.h,
              animationDelay: s.delay,
              animationDuration: `${18 + (i % 5) * 3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
