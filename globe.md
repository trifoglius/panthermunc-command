# Login Globe

The purple rotating globe on the login screen is a decorative background element. It shows a wireframe sphere with latitude/longitude lines and continent dots, tilted and spinning slowly behind the sign-in form.

## Where the code lives

| File | Role |
|------|------|
| `src/components/login/RotatingGlobe.tsx` | React component: layout metrics, SVG setup, animation loop |
| `src/components/login/globe-projection.ts` | 3D → 2D math: rotation, tilt, path generation |
| `src/components/login/globe-continents.ts` | Static data: meridian count, parallel latitudes, continent dot coordinates |
| `src/app/globals.css` | Globe and login-panel styling (`.globe-*`, `.login-panel`) |
| `src/app/login/layout.tsx` | Mounts `<RotatingGlobe />` once for the whole `/login` route |

## High-level design

The globe is drawn as **one SVG** updated every frame with `requestAnimationFrame`. Each frame:

1. Compute the current Y rotation from elapsed time (full turn every 52 seconds).
2. Project meridians, parallels, outline, and dots from spherical coordinates to SVG `d` / `cx` / `cy` attributes.
3. Let the browser repaint only the SVG layer.

This replaced an earlier **CSS 3D** implementation (dozens of `div` rings with `border`, `preserve-3d`, and a CSS `@keyframes` spin). That approach caused severe flicker because many 3D layers forced full-page repaints and z-fighting between coplanar rings.

## Projection math

All geometry goes through `projectPoint(latDeg, lonDeg, rotYDeg)` in `globe-projection.ts`.

### Spherical → Cartesian

A point on the unit sphere:

```
x = cos(lat) · sin(lon)
y = sin(lat)
z = cos(lat) · cos(lon)
```

### Y-axis spin (animation)

`applyGlobeRotation` rotates the globe around the Y axis by `rotYDeg`. This is what changes every frame.

### Fixed tilt (camera angle)

`applyShellTilt` applies the fixed viewing angle that matches the old CSS layout:

- `rotateX(18deg)`
- `rotateZ(-26deg)`

These constants are precomputed as `TILT_X` / `TILT_Z` and their sin/cos values.

### Orthographic projection

After rotation and tilt, the point is projected onto the SVG plane (X/Y only; depth is discarded):

```
svgX = GLOBE_CENTER + sx · GLOBE_RADIUS
svgY = GLOBE_CENTER - sy · GLOBE_RADIUS
```

Constants:

- `GLOBE_VIEW_SIZE = 100` (SVG viewBox is `0 0 100 100`)
- `GLOBE_RADIUS = 48`
- `GLOBE_CENTER = 50`

### Curves

| Element | Function | How it is sampled |
|---------|----------|-------------------|
| Meridians | `meridianPath(lon, rotY)` | Full great circle: latitude from -90° to 270° (360° of arc), 120 steps |
| Parallels | `parallelPath(lat, rotY)` | Longitude 0° → 360°, 120 steps |
| Outline (equator) | `parallelPath(0, rotY)` | Same as the 0° parallel |
| Continent dots | `projectPoint(lat, lon, rotY)` | One point per dot |

**Meridian note:** Sampling only latitude -90° → 90° draws half a great circle. The visible “missing half” of longitude lines was fixed by tracing the full 360° meridian loop.

**Equator note:** The `lat = 0` parallel is used as the outline ring. Non-zero parallels come from `PARALLELS` in `globe-continents.ts`; `0` is filtered out in the component to avoid drawing the equator twice.

## Static data (`globe-continents.ts`)

- `MERIDIAN_COUNT = 24` — meridians every 7.5° (`i * 180 / 24` longitude)
- `PARALLELS` — latitudes at ±75, ±60, ±45, ±30, ±15, and 0
- `CONTINENT_DOTS` — `[latitude, longitude]` pairs approximating continent shapes

Colors and opacities are defined in CSS, not in this data file.

## Layout and sizing

The globe is **fixed** to the bottom-left of the viewport, mostly off-screen so only part of the sphere shows.

### CSS variables (set in JS)

`applyGlobeMetrics()` runs on mount and updates:

| Variable | Formula | Purpose |
|----------|---------|---------|
| `--globe-size` | `min(145vmin, 1180px)` | Width and height of the scene |
| `--globe-bottom` | `-0.55 × innerHeight` | Vertical offset (negative = below viewport) |
| `--globe-left` | `-0.36 × innerWidth` | Horizontal offset (negative = left of viewport) |

CSS fallbacks use `vh` / `vw` / `vmin` if JS has not run yet.

### When metrics update

- **Initial mount** — `useLayoutEffect` sets values before paint.
- **Window resize** — debounced 200 ms (avoids recomputing on every frame during drag/resize).
- **Fullscreen** — double `requestAnimationFrame` after `fullscreenchange` so layout settles before remeasuring.

### Compositing isolation

```css
.globe-scene {
  contain: strict;
  transform: translateZ(0);
}

.login-panel {
  transform: translateZ(0);
  isolation: isolate;
}
```

The globe and login form sit on separate compositor layers so SVG updates should not repaint the form every frame.

## Login page integration

`src/app/login/layout.tsx` renders:

1. `<RotatingGlobe />` — background, `z-index: 0`
2. Login content inside `.login-panel` — foreground, `z-index: 10`

The globe stays mounted for the entire `/login` route. The page component (`login/page.tsx`) only swaps inner content (loading text vs. form). Remounting the globe on auth/Suspense transitions used to flash the whole screen on reload.

`RotatingGlobe` is a client component (`"use client"`). The layout is a server component that imports it.

## Animation loop

Inside `useEffect`:

1. Create one SVG `<path>` per meridian/parallel/outline and one `<circle>` per continent dot.
2. Start a `requestAnimationFrame` loop.
3. Each frame: compute `rotY`, update all `d` / `cx` / `cy` attributes.
4. On unmount: cancel the frame and remove SVG children.

Spin period: `SPIN_MS = 52_000` (52 seconds per full rotation).

DOM nodes are created with `document.createElementNS` rather than React children so the hot path does not trigger React reconciliation every frame.

## Styling

Stroke and fill colors live in `globals.css`:

| Class | Appearance |
|-------|------------|
| `.globe-meridian`, `.globe-parallel` | 1px stroke, `rgba(108, 52, 131, 0.38)` |
| `.globe-outline` | 1.5px stroke, `rgba(108, 52, 131, 0.55)` |
| `.globe-dot` | Fill `rgba(108, 52, 131, 0.82)`, radius `0.42` in viewBox units |

`vector-effect: non-scaling-stroke` keeps line width consistent when the SVG scales to `--globe-size`.

## Flickering: causes and fixes

Flicker on this page usually means something is forcing **cross-layer repaints** or **unstable layout** during animation. Below is what we hit in development and what to avoid when changing the globe.

### 1. CSS 3D with many DOM layers (original implementation)

**Symptom:** Globe lines, dots, and even the login card flicker together, especially in fullscreen.

**Cause:** Dozens of `div` rings using `border`, `transform-style: preserve-3d`, and a spinning parent. Browsers struggle to composite that many 3D layers; repaints bleed into sibling content (the login panel).

**Fix:** SVG + `requestAnimationFrame` projection (current approach).

**Do not revert to:** Many overlapping 3D `div` rings with CSS animation unless you accept heavy compositor load.

### 2. Z-fighting between coplanar rings (CSS 3D era)

**Symptom:** One line (often the equator) flickers while the globe spins.

**Cause:** Two rings on the same 3D plane (e.g. outline and `lat = 0` parallel) fighting for the same depth buffer pixels.

**Mitigations tried:** Tiny `translateZ` offsets, removing duplicate equator parallel, pushing outline back slightly.

**In SVG:** Coplanar z-fighting does not apply; duplicate equator geometry would just overdraw the same stroke, not flicker.

### 3. `transform` on the same element as `perspective`

**Symptom:** Entire globe disappears.

**Cause:** `transform: translateZ(0)` on `.globe-scene` while it also had `perspective: 1100px`. Promoting the perspective element to its own layer breaks 3D for children.

**Rule:** Never put `transform` on the element that owns `perspective`. The current SVG approach does not use CSS perspective.

### 4. `backface-visibility: hidden` on 3D rings

**Symptom:** Half the latitude lines vanish.

**Cause:** Southern parallels tilt “away” from the camera; the browser culls their back faces.

**Rule:** Do not use `backface-visibility: hidden` on globe ring elements if returning to 3D CSS.

### 5. Viewport-relative sizing during resize / fullscreen

**Symptom:** Globe and UI jump or flicker when entering fullscreen or resizing.

**Cause:** Sizing/position with `vmin`, `%`, or container queries (`50cqmin`) recalculates on every resize event. Fullscreen fires many rapid resize events.

**Fix:** Set `--globe-size`, `--globe-bottom`, and `--globe-left` in pixels from JS; debounce resize; remeasure fullscreen after layout settles.

**Avoid:** Driving dot radius or scene size from units that change every resize frame without debouncing.

### 6. Remounting the globe on login state changes

**Symptom:** Whole login screen flashes in and out on reload.

**Cause:** Globe wrapped inside a shell that unmounted between Suspense fallback, auth loading, and form render.

**Fix:** Mount `<RotatingGlobe />` in `login/layout.tsx`, not inside conditional page content.

### 7. `will-change: transform` + container queries (CSS 3D era)

**Symptom:** Dots drift off the sphere surface.

**Cause:** `will-change: transform` on the spinning parent interfered with `container-type: size` / `50cqmin` used for dot depth.

**Rule:** If using CSS 3D again, do not combine `will-change` on the spinner with container-query-based dot placement.

### 8. Missing half of meridians (SVG projection bug)

**Symptom:** Longitude lines on one hemisphere only.

**Cause:** Meridians sampled latitude -90° → 90° (front semicircle only).

**Fix:** Sample latitude -90° → 270° along the full great circle in `meridianPath`.

This is a **drawing** bug, not flicker, but it showed up after the SVG migration.

## Debugging checklist

If flicker returns after a change:

1. **Is the globe still SVG?** If someone reintroduces CSS 3D rings, expect compositor issues.
2. **Does the login card flicker too?** Likely a full-page repaint — check 3D layers, missing `contain`, or shared animated transforms on a parent.
3. **Does it only happen on fullscreen/resize?** Check `applyGlobeMetrics` timing and debouncing.
4. **Does the whole globe flash on reload?** Check whether `RotatingGlobe` remounts (layout vs. page).
5. **Does one line flicker while spinning?** On SVG, look for duplicate paths; on CSS 3D, look for coplanar rings.
6. **Did the globe vanish?** Check for `transform` + `perspective` on the same element, or broken projection imports.

## Safe change guidelines

- **Colors / opacity:** Edit `.globe-*` rules in `globals.css` only.
- **Spin speed:** Change `SPIN_MS` in `RotatingGlobe.tsx`.
- **Tilt angle:** Change `TILT_X` / `TILT_Z` in `globe-projection.ts` (keep in sync with any design intent).
- **Grid density:** Adjust `MERIDIAN_COUNT` or `PARALLELS` in `globe-continents.ts`.
- **Position / scale:** Prefer updating formulas in `applyGlobeMetrics()` and CSS fallbacks together.
- **Performance:** Keep one SVG and one rAF loop; avoid per-frame React state updates for path data.

## Related Turbopack warning

Running `next dev` from this repo may log a warning about multiple `package-lock.json` files (parent directory vs. `panthermunc-command/`). That is unrelated to globe rendering. Setting `turbopack.root` in `next.config.ts` was attempted to silence it but broke SWC helper resolution in Next.js 16.2.9; leave the warning alone unless upgrading Next.js and retesting that config.
