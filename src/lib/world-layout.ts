export type CubeDepth = "near" | "mid" | "far";

export type WorldPosition = {
  x: number;
  y: number;
  z: number;
  depth: CubeDepth;
};

/** Shared plaza geometry — keep cubes above the floor mesh. */
export const CUBE_SIZE = 1.35;
export const FLOOR_Y = 0;
export const CUBE_BOB_AMPLITUDE = 0.08;
/** Lowest allowed cube center Y (half-size + clearance above floor). */
export const MIN_CUBE_CENTER_Y = FLOOR_Y + CUBE_SIZE / 2 + 0.15;

export function clampCubeCenterY(y: number): number {
  return Math.max(y, MIN_CUBE_CENTER_Y);
}

/**
 * Scatter cubes on the XZ plaza plane with float-height Y only
 * (WaraWara-style constellation — never a vertical 2D grid).
 */
export function layoutCubePositions(count: number): WorldPosition[] {
  if (count <= 0) return [];

  const positions: WorldPosition[] = [];
  const cols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(count * 1.4))));
  const spacingX = 2.6;
  const spacingZ = 2.4;
  const rows = Math.ceil(count / cols);
  const offsetX = ((cols - 1) * spacingX) / -2;
  const offsetZ = ((rows - 1) * spacingZ) / -2;

  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    const jitterX = Math.sin(i * 2.1) * 0.4;
    const jitterZ = Math.cos(i * 1.7) * 0.35;
    const floatBand = 0.35 + (i % 3) * 0.28 + Math.sin(i * 0.9) * 0.12;
    const y = clampCubeCenterY(MIN_CUBE_CENTER_Y + floatBand);

    const x = offsetX + col * spacingX + jitterX;
    const z = offsetZ + row * spacingZ + jitterZ - 0.4;

    let depth: CubeDepth = "mid";
    if (z > 1.2) depth = "near";
    else if (z < -1.2) depth = "far";

    positions.push({ x, y, z, depth });
  }

  return positions;
}
