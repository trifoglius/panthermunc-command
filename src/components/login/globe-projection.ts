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

function latLonToUnit(latDeg: number, lonDeg: number) {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  return [
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  ] as const;
}

function projectUnitPoint(
  x: number,
  y: number,
  z: number,
  rotYDeg: number
) {
  const [rx, ry, rz] = applyGlobeRotation(x, y, z, rotYDeg);
  const [sx, sy, sz] = applyShellTilt(rx, ry, rz);
  return {
    x: GLOBE_CENTER + sx * GLOBE_RADIUS,
    y: GLOBE_CENTER - sy * GLOBE_RADIUS,
    front: sz >= 0,
  };
}

function unitAngularDistance(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number
) {
  const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  return Math.acos(dot);
}

function slerpUnit(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  t: number
) {
  const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  if (dot > 0.9995) {
    return [
      ax + t * (bx - ax),
      ay + t * (by - ay),
      az + t * (bz - az),
    ] as const;
  }
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;
  return [a * ax + b * bx, a * ay + b * by, a * az + b * bz] as const;
}

function densifyOutlineRing(
  points: readonly (readonly [number, number])[]
): [number, number, number][] {
  if (points.length < 2) {
    return points.map(([lat, lon]) => {
      const [x, y, z] = latLonToUnit(lat, lon);
      return [x, y, z];
    });
  }

  const dense: [number, number, number][] = [];
  for (let i = 0; i < points.length; i += 1) {
    const [latA, lonA] = points[i];
    const [latB, lonB] = points[(i + 1) % points.length];
    const [ax, ay, az] = latLonToUnit(latA, lonA);
    const [bx, by, bz] = latLonToUnit(latB, lonB);
    const arc = unitAngularDistance(ax, ay, az, bx, by, bz);
    const steps = Math.max(1, Math.ceil(arc / (8 * DEG)));

    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      const [x, y, z] = slerpUnit(ax, ay, az, bx, by, bz, t);
      dense.push([x, y, z]);
    }
  }
  return dense;
}

export function projectPoint(
  latDeg: number,
  lonDeg: number,
  rotYDeg: number
): [number, number] {
  const [x, y, z] = latLonToUnit(latDeg, lonDeg);
  const projected = projectUnitPoint(x, y, z, rotYDeg);
  return [projected.x, projected.y];
}

/** North pole Y in viewBox units; constant because spin is around the Y axis. */
export function northPoleViewBoxY(): number {
  return projectUnitPoint(0, 1, 0, 0).y;
}

type LandClip = (lat: number, lon: number) => boolean;

const GRID_STEPS = 120;
const LAND_CLIP_MAX_DEPTH = 8;
const LAND_CLIP_MIN_ARC = 0.4 * DEG;

function unitToLatLon(x: number, y: number, z: number): [number, number] {
  return [Math.asin(y) / DEG, Math.atan2(x, z) / DEG];
}

function appendVisibleSegment(
  parts: string[],
  open: { value: boolean },
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  rotYDeg: number,
  landClip: LandClip | undefined,
  depth = 0
) {
  const a = projectUnitPoint(ax, ay, az, rotYDeg);
  const b = projectUnitPoint(bx, by, bz, rotYDeg);
  if (!a.front || !b.front) {
    open.value = false;
    return;
  }

  if (landClip) {
    const [latA, lonA] = unitToLatLon(ax, ay, az);
    const [latB, lonB] = unitToLatLon(bx, by, bz);
    const landA = landClip(latA, lonA);
    const landB = landClip(latB, lonB);

    if (landA && landB) {
      open.value = false;
      return;
    }

    if (landA || landB) {
      const arc = unitAngularDistance(ax, ay, az, bx, by, bz);
      if (depth < LAND_CLIP_MAX_DEPTH && arc > LAND_CLIP_MIN_ARC) {
        const [mx, my, mz] = slerpUnit(ax, ay, az, bx, by, bz, 0.5);
        appendVisibleSegment(
          parts,
          open,
          ax,
          ay,
          az,
          mx,
          my,
          mz,
          rotYDeg,
          landClip,
          depth + 1
        );
        appendVisibleSegment(
          parts,
          open,
          mx,
          my,
          mz,
          bx,
          by,
          bz,
          rotYDeg,
          landClip,
          depth + 1
        );
        return;
      }
      open.value = false;
      return;
    }

    const [mx, my, mz] = slerpUnit(ax, ay, az, bx, by, bz, 0.5);
    const [latM, lonM] = unitToLatLon(mx, my, mz);
    if (landClip(latM, lonM)) {
      const arc = unitAngularDistance(ax, ay, az, bx, by, bz);
      if (depth < LAND_CLIP_MAX_DEPTH && arc > LAND_CLIP_MIN_ARC) {
        appendVisibleSegment(
          parts,
          open,
          ax,
          ay,
          az,
          mx,
          my,
          mz,
          rotYDeg,
          landClip,
          depth + 1
        );
        appendVisibleSegment(
          parts,
          open,
          mx,
          my,
          mz,
          bx,
          by,
          bz,
          rotYDeg,
          landClip,
          depth + 1
        );
        return;
      }
      open.value = false;
      return;
    }
  }

  if (!open.value) {
    parts.push(`M ${a.x.toFixed(2)} ${a.y.toFixed(2)}`);
    open.value = true;
  }
  parts.push(`L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
}

function visibleGridPath(
  sampleUnit: (step: number, steps: number) => readonly [number, number, number],
  steps: number,
  rotYDeg: number,
  landClip?: LandClip
): string {
  const parts: string[] = [];
  const open = { value: false };

  for (let i = 1; i <= steps; i += 1) {
    const [ax, ay, az] = sampleUnit(i - 1, steps);
    const [bx, by, bz] = sampleUnit(i, steps);
    appendVisibleSegment(parts, open, ax, ay, az, bx, by, bz, rotYDeg, landClip);
  }

  return parts.join(" ");
}

export function meridianPath(
  lonDeg: number,
  rotYDeg: number,
  landClip?: LandClip
): string {
  return visibleGridPath(
    (step, steps) => {
      const latDeg = -90 + (step / steps) * 360;
      return latLonToUnit(latDeg, lonDeg);
    },
    GRID_STEPS,
    rotYDeg,
    landClip
  );
}

export function parallelPath(
  latDeg: number,
  rotYDeg: number,
  landClip?: LandClip
): string {
  return visibleGridPath(
    (step, steps) => {
      const lonDeg = (step / steps) * 360;
      return latLonToUnit(latDeg, lonDeg);
    },
    GRID_STEPS,
    rotYDeg,
    landClip
  );
}

export function continentOutlinePath(
  points: readonly (readonly [number, number])[],
  rotYDeg: number
): string {
  if (points.length < 2) return "";

  const projected = densifyOutlineRing(points).map(([x, y, z]) =>
    projectUnitPoint(x, y, z, rotYDeg)
  );

  const parts: string[] = [];
  let open = false;

  for (let i = 0; i < projected.length; i += 1) {
    const a = projected[i];
    const b = projected[(i + 1) % projected.length];
    if (!a.front || !b.front) {
      open = false;
      continue;
    }

    if (!open) {
      parts.push(`M ${a.x.toFixed(2)} ${a.y.toFixed(2)}`);
      open = true;
    }
    parts.push(`L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
  }

  return parts.join(" ");
}
