export type CubeDepth = "near" | "mid" | "far";

export type WorldPosition = {
  x: number;
  y: number;
  z: number;
  depth: CubeDepth;
};

/** Scatter cubes in a loose constellation with depth variation. */
export function layoutCubePositions(count: number): WorldPosition[] {
  if (count <= 0) return [];

  const positions: WorldPosition[] = [];
  const cols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(count * 1.4))));
  const spacingX = 150;
  const spacingY = 130;

  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rows = Math.ceil(count / cols);
    const offsetX = ((cols - 1) * spacingX) / -2;
    const offsetY = ((rows - 1) * spacingY) / -2 - 20;

    // Mild spiral / jitter so it doesn't look like a spreadsheet
    const jitterX = Math.sin(i * 2.1) * 28;
    const jitterY = Math.cos(i * 1.7) * 22;
    const zWave = ((i % 3) - 1) * 70 + Math.sin(i * 0.9) * 25;

    let depth: CubeDepth = "mid";
    if (zWave > 40) depth = "near";
    else if (zWave < -40) depth = "far";

    positions.push({
      x: offsetX + col * spacingX + jitterX,
      y: offsetY + row * spacingY + jitterY,
      z: zWave,
      depth,
    });
  }

  return positions;
}
