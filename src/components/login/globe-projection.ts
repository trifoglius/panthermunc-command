const DEG = Math.PI / 180;

// Matches former globe-shell: rotateZ(-26deg) rotateX(18deg)
const TILT_Z = -26 * DEG;
const TILT_X = 18 * DEG;

const COS_TILT_Z = Math.cos(TILT_Z);
const SIN_TILT_Z = Math.sin(TILT_Z);
const COS_TILT_X = Math.cos(TILT_X);
const SIN_TILT_X = Math.sin(TILT_X);

export const GLOBE_VIEW_SIZE = 100;
export const GLOBE_RADIUS = 48;
export const GLOBE_CENTER = GLOBE_VIEW_SIZE / 2;

function applyGlobeRotation(
  x: number,
  y: number,
  z: number,
  rotYDeg: number
) {
  const rot = rotYDeg * DEG;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const xr = cos * x + sin * z;
  const yr = y;
  const zr = -sin * x + cos * z;
  return [xr, yr, zr] as const;
}

function applyShellTilt(x: number, y: number, z: number) {
  const y1 = COS_TILT_X * y - SIN_TILT_X * z;
  const z1 = SIN_TILT_X * y + COS_TILT_X * z;
  const x2 = COS_TILT_Z * x - SIN_TILT_Z * y1;
  const y2 = SIN_TILT_Z * x + COS_TILT_Z * y1;
  return [x2, y2, z1] as const;
}

export function projectPoint(
  latDeg: number,
  lonDeg: number,
  rotYDeg: number
): [number, number] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  const [rx, ry, rz] = applyGlobeRotation(x, y, z, rotYDeg);
  const [sx, sy] = applyShellTilt(rx, ry, rz);
  return [
    GLOBE_CENTER + sx * GLOBE_RADIUS,
    GLOBE_CENTER - sy * GLOBE_RADIUS,
  ];
}

function sampleCurve(
  sample: (t: number) => [number, number],
  steps: number
): string {
  const parts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const [x, y] = sample((i / steps) * 360);
    parts.push(
      `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    );
  }
  return parts.join(" ");
}

export function meridianPath(lonDeg: number, rotYDeg: number): string {
  const parts: string[] = [];
  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    // Trace the full great circle (not just the front semicircle).
    const latDeg = -90 + (i / steps) * 360;
    const [x, y] = projectPoint(latDeg, lonDeg, rotYDeg);
    parts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return parts.join(" ");
}

export function parallelPath(latDeg: number, rotYDeg: number): string {
  return sampleCurve((lon) => projectPoint(latDeg, lon, rotYDeg), 120);
}
