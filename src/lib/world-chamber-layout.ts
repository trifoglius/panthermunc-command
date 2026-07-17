import type { Vector3Tuple } from "three";

/** Grid constellation for entity tiles inside a chamber. */
export function layoutEntityGrid(
  count: number,
  opts?: { cols?: number; spacing?: number; y?: number }
): Vector3Tuple[] {
  if (count <= 0) return [];
  const cols = opts?.cols ?? Math.min(6, Math.max(3, Math.ceil(Math.sqrt(count))));
  const spacing = opts?.spacing ?? 1.55;
  const baseY = opts?.y ?? 0.9;
  const rows = Math.ceil(count / cols);
  const offsetX = ((cols - 1) * spacing) / -2;
  const offsetZ = ((rows - 1) * spacing) / -2;

  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const jitterX = Math.sin(i * 1.7) * 0.12;
    const jitterZ = Math.cos(i * 1.3) * 0.12;
    return [
      offsetX + col * spacing + jitterX,
      baseY + Math.sin(i * 0.8) * 0.08,
      offsetZ + row * spacing + jitterZ,
    ] as Vector3Tuple;
  });
}

/** Arc layout for roll-call presence cubes. */
export function layoutEntityArc(
  count: number,
  opts?: { radius?: number; y?: number; span?: number }
): Vector3Tuple[] {
  if (count <= 0) return [];
  const radius = opts?.radius ?? 4.2;
  const y = opts?.y ?? 1.0;
  const span = opts?.span ?? Math.PI * 0.95;
  const start = -span / 2;

  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const angle = start + t * span;
    return [
      Math.sin(angle) * radius,
      y + Math.sin(i * 0.6) * 0.06,
      -Math.cos(angle) * radius * 0.55,
    ] as Vector3Tuple;
  });
}

/** Horizontal rail / queue lane positions. */
export function layoutEntityRail(
  count: number,
  opts?: { spacing?: number; y?: number; z?: number }
): Vector3Tuple[] {
  if (count <= 0) return [];
  const spacing = opts?.spacing ?? 1.7;
  const y = opts?.y ?? 1.1;
  const z = opts?.z ?? 0;
  const offsetX = ((count - 1) * spacing) / -2;
  return Array.from({ length: count }, (_, i) => [
    offsetX + i * spacing,
    y,
    z,
  ] as Vector3Tuple);
}

/** Fan / stack for motions — slight arc and depth. */
export function layoutEntityFan(
  count: number,
  opts?: { radius?: number; y?: number }
): Vector3Tuple[] {
  if (count <= 0) return [];
  const radius = opts?.radius ?? 3.6;
  const y = opts?.y ?? 1.2;
  const span = Math.min(Math.PI * 0.85, 0.28 * count);
  const start = -span / 2;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const angle = start + t * span;
    return [
      Math.sin(angle) * radius,
      y + i * 0.02,
      -Math.cos(angle) * radius * 0.4 - i * 0.05,
    ] as Vector3Tuple;
  });
}
