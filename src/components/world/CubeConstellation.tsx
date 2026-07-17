"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "@/context/ThemeContext";
import { getWorldPalette } from "@/lib/world-theme";
import { layoutCubePositions } from "@/lib/world-layout";
import {
  loadCubePositionOverrides,
  resolveCubePosition,
  saveCubePositionOverrides,
  type CubePosOffset,
} from "@/lib/world-cube-positions";
import { GlassCube3D } from "@/components/world/GlassCube3D";
import {
  requestWorldSelect,
  WorldCanvas,
} from "@/components/world/WorldCanvas";
import type { WorldCubeDef } from "@/lib/world-cube-catalog";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const DEFAULT_HINT =
  "Drag cubes to rearrange · Click to open · Pan to look around";

export function CubeConstellation({
  cubes,
  icons,
  title,
  subtitle,
  hint = DEFAULT_HINT,
  layoutKey = "home",
  onBack,
  backLabel,
  onCubeActivate,
  overlay,
}: {
  cubes: WorldCubeDef[];
  icons: Record<string, ReactNode>;
  title: ReactNode;
  subtitle?: ReactNode;
  hint?: string;
  /** Persistence namespace for drag offsets (e.g. conference id / committee id). */
  layoutKey?: string;
  onBack?: () => void;
  backLabel?: string;
  onCubeActivate: (cube: WorldCubeDef) => void;
  overlay?: ReactNode;
}) {
  const { theme } = useTheme();
  const palette = useMemo(() => getWorldPalette(theme), [theme]);
  const basePositions = useMemo(
    () => layoutCubePositions(cubes.length),
    [cubes.length]
  );
  const reducedMotion = useReducedMotion();

  const [overrides, setOverrides] = useState<Record<string, CubePosOffset>>(
    () => loadCubePositionOverrides(layoutKey)
  );

  useEffect(() => {
    setOverrides(loadCubePositionOverrides(layoutKey));
  }, [layoutKey]);

  const handlePositionChange = useCallback(
    (cubeId: string, next: [number, number, number]) => {
      setOverrides((prev) => {
        const updated = {
          ...prev,
          [cubeId]: { x: next[0], y: next[1], z: next[2] },
        };
        saveCubePositionOverrides(layoutKey, updated);
        return updated;
      });
    },
    [layoutKey]
  );

  return (
    <WorldCanvas
      title={title}
      subtitle={subtitle}
      hint={hint}
      onBack={onBack}
      backLabel={backLabel}
      mode="constellation"
      overlay={overlay}
    >
      {cubes.map((cube, i) => {
        const base = basePositions[i] ?? {
          x: 0,
          y: 1.2,
          z: 0,
          depth: "mid" as const,
        };
        const pos = resolveCubePosition(base, overrides[cube.id]);
        return (
          <GlassCube3D
            key={cube.id}
            position={pos}
            label={cube.label}
            icon={icons[cube.id]}
            badge={cube.badge}
            selected={!!cube.selected}
            depth={base.depth}
            bobDelayMs={(i % 5) * 180}
            enterDelayMs={i * 45}
            palette={palette}
            reducedMotion={reducedMotion}
            draggable
            onPositionChange={(next) => handlePositionChange(cube.id, next)}
            onSelect={() =>
              requestWorldSelect(() => onCubeActivate(cube))
            }
          />
        );
      })}
    </WorldCanvas>
  );
}
