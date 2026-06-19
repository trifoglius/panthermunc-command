/**
 * Simplified land outlines for the header globe (Natural Earth 110m, CC0).
 * Rings are pre-ordered coast traces; do not re-sort by centroid angle.
 */
export const CONTINENT_OUTLINES: readonly (readonly [number, number][])[] = [
  [
    [77, 107], [72.2, 149.5], [62.5, 177.4], [53.2, 156], [59.3, 145.5], [43.4, 134.9],
    [39.9, 124.3], [30.1, 121.5], [19.1, 105.7], [12.3, 100], [8.4, 98.2], [21.7, 88.9],
    [10.3, 76.1], [25.2, 62.9], [25.8, 51.6], [16.4, 52.4], [24.1, 38], [19.8, 37.1],
    [8.1, 50.1], [-10.3, 40.3], [-28.8, 32.2], [-25.4, 14.7], [-4, 11.1], [5, -3.3],
    [18.1, -16.1], [35.3, -4.6], [31.2, 16.6], [36.3, 35.8], [41, 40.4], [45.3, 29.6],
    [39.9, 20], [38.8, 15.9], [36.7, -4.4], [48.7, -4.6], [53.8, 14.1], [63.8, 22.4],
    [58.6, 5.7], [67.9, 40.3], [68.9, 53.7], [66.5, 72.8],
  ],
  [
    [69.5, -90.5], [64.1, -88.5], [54.3, -82.4], [60.8, -77.8], [56.3, -61.8], [49.1, -68.5],
    [45.3, -61], [41.3, -71.9], [36.9, -76], [25.9, -81.7], [29.7, -93.8], [18.5, -92.8],
    [15.8, -87.4], [9.2, -78.1], [11, -71.4], [8.4, -59.8], [-0.1, -50.4], [-4.8, -37.2],
    [-17.9, -39.3], [-28.7, -48.9], [-36.9, -56.8], [-45.6, -67.3], [-50.4, -75.5], [-41.8, -74],
    [-25.7, -70.7], [-12.2, -77.1], [-0.3, -80.4], [7.2, -80.9], [13.9, -91.2], [19.9, -105.5],
    [31.8, -114.8], [26.3, -112.8], [36.2, -121.7], [49, -123], [59.7, -140.8], [56.5, -158.1],
    [59.6, -161.9], [66.1, -161.7], [68.9, -136.5], [68.3, -108.8],
  ],
  [
    [-13.8, 143.6], [-22.3, 149.7], [-31.6, 152.9], [-38.1, 144.5], [-33.6, 137.9], [-31.9, 128.2],
    [-34.4, 115.6], [-25.9, 113.9], [-20, 119.8], [-14.1, 126.1], [-11.4, 133], [-17.4, 139.3],
  ],
  [
    [83.5, -27.1], [81.9, -15.8], [76.6, -21.7], [72.6, -24.3], [70.1, -22.3], [65.9, -37],
    [61.1, -42.9], [64.3, -52.1], [69.4, -52.6], [73, -55.3], [77.3, -68.8], [81.8, -62.7],
  ],
  [
    [-1.2, 134.1], [-2.3, 136.3], [-2.6, 141], [-5.5, 146], [-8, 148.1], [-10.7, 150],
    [-8.1, 146], [-9.2, 142.1], [-8.4, 137.6], [-5.4, 137.9], [-3.3, 132.8], [-1.6, 131.8],
  ],
  [
    [73.2, -86.6], [72.1, -80.7], [70.9, -71.2], [68.1, -66.4], [65, -63.9], [64.6, -65.7],
    [63.7, -68.8], [62.9, -71], [64.2, -77.7], [67.3, -72.7], [70.2, -79], [70.8, -89.5],
  ],
  [
    [1.4, 125.2], [0.4, 122.7], [-0.5, 120], [-1, 121.5], [-1.9, 121.5], [-4.7, 123.2],
    [-4.5, 122.7], [-2.6, 121], [-5.5, 120.4], [-3.5, 119.1], [-1.4, 119.3], [1, 121.7],
  ],
  [
    [1.8, 117.9], [0.8, 117.8], [-1.5, 116.6], [-4.1, 114.9], [-3.1, 113.3], [-2.9, 110.2],
    [0.4, 109], [1.9, 111.2], [3.1, 113], [5.4, 115.5], [6, 117.7], [4.5, 118.6],
  ],
  [
    [37.1, 141], [35.1, 140.3], [34.6, 137.2], [34.6, 135.1], [33.9, 131], [31.4, 130.2],
    [33.3, 129.4], [35.4, 132.6], [35.5, 135.7], [36.8, 137.4], [39.4, 140.1], [40, 141.9],
  ],
  [
    [-13.6, 50.1], [-16, 50.2], [-17.1, 49.5], [-20.5, 48.5], [-22.4, 47.9], [-25.2, 46.3],
    [-24.5, 43.8], [-21.3, 43.4], [-19, 44.2], [-16.2, 44.4], [-15.2, 46.9], [-13.1, 48.8],
  ],
  [
    [-5.9, 105.8], [-5, 103.9], [-2.8, 101.4], [-0.7, 100.1], [1.8, 98.6], [3.9, 96.4],
    [5.4, 95.9], [4.3, 98.4], [2.1, 100.6], [1.4, 102.5], [-1.1, 104], [-2.4, 105.6],
  ],
  [
    [58.6, -3], [57.7, -2], [55.9, -2.1], [54.5, -0.4], [51.8, 1.1], [50.8, -0.8],
    [50.3, -4.5], [51.4, -3.4], [52.3, -4.2], [54, -2.9], [55.8, -5], [56.8, -6.1],
  ],
];

export const PARALLELS = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75] as const;
export const MERIDIAN_COUNT = 24;

function pointInLatLonRing(
  lat: number,
  lon: number,
  ring: readonly (readonly [number, number])[]
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True when a lat/lon point falls inside any simplified land outline. */
export function isLandPoint(lat: number, lon: number): boolean {
  for (const ring of CONTINENT_OUTLINES) {
    if (pointInLatLonRing(lat, lon, ring)) return true;
  }
  return false;
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function sampleIrregularLandDots(
  targetCount: number,
  minSpacingDeg: number,
  seed: number
): [number, number][] {
  const random = createSeededRandom(seed);
  const dots: [number, number][] = [];
  const maxAttempts = targetCount * 250;
  let attempts = 0;

  while (dots.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const lat = random() * 156 - 78;
    const lon = random() * 360 - 180;
    if (!isLandPoint(lat, lon)) continue;

    let crowded = false;
    for (const [otherLat, otherLon] of dots) {
      if (Math.hypot(lat - otherLat, lon - otherLon) < minSpacingDeg) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;

    dots.push([lat, lon]);
  }

  return dots;
}

/** ~150 login globe dots with irregular spacing, from the same land outlines as the header globe. */
export const CONTINENT_DOTS = sampleIrregularLandDots(150, 2.8, 0x6c34_83);
