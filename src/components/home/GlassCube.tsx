"use client";

import {
  useCallback,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from "react";
import { SelectionBrackets } from "@/components/home/SelectionBrackets";

type GlassCubeSize = "sm" | "md" | "lg";

interface GlassCubeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: ReactNode;
  selected?: boolean;
  showBrackets?: boolean;
  badge?: string | number;
  size?: GlassCubeSize;
  bobDelayMs?: number;
  enterDelayMs?: number;
  /** Depth fog class from MenuWorld: near | mid | far */
  depth?: "near" | "mid" | "far";
}

const sizeClass: Record<GlassCubeSize, string> = {
  sm: "glass-cube-sm",
  md: "",
  lg: "glass-cube-lg",
};

export function GlassCube({
  label,
  icon,
  selected = false,
  showBrackets = false,
  badge,
  size = "md",
  bobDelayMs = 0,
  enterDelayMs = 0,
  depth = "mid",
  className = "",
  style,
  children,
  onPointerMove,
  onPointerLeave,
  ...props
}: GlassCubeProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [brackets, setBrackets] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMove = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      onPointerMove?.(e);
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      setTilt({
        x: (0.5 - py) * 12,
        y: (px - 0.5) * 16,
      });
      setBrackets(true);
    },
    [onPointerMove]
  );

  const handleLeave = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      onPointerLeave?.(e);
      setTilt({ x: 0, y: 0 });
      setBrackets(false);
    },
    [onPointerLeave]
  );

  const showCorner = selected || showBrackets || brackets;

  return (
    <span
      className={`glass-cube-bob glass-cube-enter cube-depth-${depth}`}
      style={{
        ["--bob-delay" as string]: `${bobDelayMs}ms`,
        ["--enter-delay" as string]: `${enterDelayMs}ms`,
      }}
    >
      <button
        ref={ref}
        type="button"
        aria-pressed={selected || undefined}
        aria-label={label}
        className={`glass-cube ${sizeClass[size]} ${selected ? "glass-cube-selected" : ""} ${className}`}
        style={{
          ...style,
          ["--tilt-x" as string]: `${tilt.x}deg`,
          ["--tilt-y" as string]: `${tilt.y}deg`,
        }}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onFocus={() => setBrackets(true)}
        onBlur={() => setBrackets(false)}
        {...props}
      >
        <span className="cube-mesh" aria-hidden={!showCorner}>
          <span className="cube-face cube-face-front">
            {showCorner && <SelectionBrackets />}
            {badge != null && badge !== "" && (
              <span className="glass-cube-badge">{badge}</span>
            )}
            {icon != null && <span className="glass-cube-icon">{icon}</span>}
            {children}
            <span className="glass-cube-label">{label}</span>
          </span>
          <span className="cube-face cube-face-back" />
          <span className="cube-face cube-face-right" />
          <span className="cube-face cube-face-left" />
          <span className="cube-face cube-face-top" />
          <span className="cube-face cube-face-bottom" />
        </span>
        {/* Accessible name for SR when faces are aria-hidden-ish */}
        <span className="sr-only">{label}</span>
      </button>
    </span>
  );
}
