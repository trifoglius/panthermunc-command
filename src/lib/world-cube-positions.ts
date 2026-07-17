import type { WorldPosition } from "@/lib/world-layout";
import { clampCubeCenterY } from "@/lib/world-layout";

const STORAGE_PREFIX = "panthermunc-cube-pos:";

export type CubePosOffset = { x: number; y: number; z: number };

function storageKey(layoutKey: string): string {
  return `${STORAGE_PREFIX}${layoutKey}`;
}

export function loadCubePositionOverrides(
  layoutKey: string
): Record<string, CubePosOffset> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(layoutKey));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CubePosOffset>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveCubePositionOverrides(
  layoutKey: string,
  overrides: Record<string, CubePosOffset>
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(layoutKey), JSON.stringify(overrides));
  } catch {
    /* ignore quota / private mode */
  }
}

export function resolveCubePosition(
  base: WorldPosition,
  override?: CubePosOffset | null
): [number, number, number] {
  if (!override) {
    return [base.x, clampCubeCenterY(base.y), base.z];
  }
  return [
    override.x,
    clampCubeCenterY(override.y),
    override.z,
  ];
}
