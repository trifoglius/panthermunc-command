# Globes

PantherMUNC uses two variants of the same SVG globe, both rendered by `RotatingGlobe`:

| Variant | Name | Where it appears | Role |
|---------|------|------------------|------|
| `login` | **Login globe** | `/login` and `/login/admin` backgrounds | Decorative wireframe behind the sign-in form |
| `header` | **Indicator globe** | Committee workspace header (`Header.tsx`) | Live status indicator: spins quietly and flashes color on committee events |

Both share projection math, the 52-second spin loop, and DOM construction via `requestAnimationFrame`. They differ in size, grid density, land representation, styling, and whether they respond to conference events.

## Where the code lives

| File | Role |
|------|------|
| `src/components/login/RotatingGlobe.tsx` | React component: `variant` switch, SVG setup, animation loop, indicator flash class toggling |
| `src/components/login/globe-projection.ts` | 3D → 2D math: rotation, tilt, paths, land clipping, continent outlines |
| `src/components/login/globe-continents.ts` | Static data: grid constants, land outlines, continent dots, `isLandPoint` |
| `src/components/login/LoginLayoutShell.tsx` | Mounts the login globe for the whole `/login` route |
| `src/components/layout/Header.tsx` | Mounts the indicator globe and `HeaderDotMatrix` |
| `src/components/layout/HeaderDotMatrix.tsx` | Canvas dot field behind the header; pulses on indicator flashes |
| `src/context/HeaderGlobeFlashContext.tsx` | Flash state, motion-pass/fail watcher, `triggerFlash` API |
| `src/components/layout/AppShell.tsx` | Triggers blue flash when admin notifications arrive |
| `src/hooks/useCountdown.ts`, `src/hooks/useSessionTimers.ts` | Trigger yellow flash when a timer expires |
| `src/app/globals.css` | Globe, login-panel, indicator, flash, and dot-matrix styling |

## Shared implementation

The globe is drawn as **one SVG** updated every frame with `requestAnimationFrame`. Each frame:

1. Compute the current Y rotation from elapsed time (full turn every 52 seconds).
2. Project meridians, parallels, outline, and land geometry from spherical coordinates to SVG `d` / `cx` / `cy` attributes.
3. Let the browser repaint only the SVG layer.

`RotatingGlobe` accepts a `variant` prop:

```tsx
<RotatingGlobe />                              // login (default)
<RotatingGlobe variant="header" flash={flash} flashKey={flashKey} size={42} />
```

DOM nodes are created with `document.createElementNS` rather than React children so the hot path does not trigger React reconciliation every frame.

Spin period: `SPIN_MS = 52_000` (52 seconds per full rotation).

This replaced an earlier **CSS 3D** implementation (dozens of `div` rings with `border`, `preserve-3d`, and a CSS `@keyframes` spin). That approach caused severe flicker because many 3D layers forced full-page repaints and z-fighting between coplanar rings.

---

## Login globe

The login globe is a large decorative wireframe tilted and spinning slowly behind the sign-in form. It shows a dense latitude/longitude grid, a rim circle, and ~150 continent dots sampled from the same land outlines used by the indicator globe.

### Integration

`LoginLayoutShell` renders:

1. `<RotatingGlobe />` — background, `z-index: 0`
2. Login content inside `.login-panel` — foreground, `z-index: 10`

The globe stays mounted for the entire `/login` route. The page component only swaps inner content (loading text vs. form). Remounting the globe on auth/Suspense transitions used to flash the whole screen on reload.

On `/login/admin`, the shell adds `login-theme-admin`, which switches strokes and dots to white on the black bootstrap background.

### Geometry

| Element | Source |
|---------|--------|
| Meridians | `MERIDIAN_COUNT = 24` (every 7.5°) |
| Parallels | `PARALLELS` at ±75, ±60, ±45, ±30, ±15 (equator drawn separately as outline) |
| Outline | `parallelPath(0, rotY)` — the equator |
| Rim | Fixed SVG `<circle>` at `GLOBE_RADIUS` |
| Land | `CONTINENT_DOTS` — ~150 irregular dots inside `CONTINENT_OUTLINES` |

Continent dots pulse independently via CSS (`globe-dot-pulse`), with per-dot `animationDelay` and `animationDuration` set in JS for a staggered shimmer.

Grid lines are **not** land-clipped on the login globe; the full wireframe is visible over oceans and continents.

### Layout and sizing

The login globe is **fixed** to the bottom-left of the viewport, mostly off-screen so only part of the sphere shows. Its north pole sits near a fixed margin from the top of the viewport.

`applyGlobeMetrics()` runs on mount and updates:

| Variable | Formula | Purpose |
|----------|---------|---------|
| `--globe-size` | `min(145vmin, 1180px)` | Width and height of the scene |
| `--globe-bottom` | Derived from viewport height, globe size, and `northPoleViewBoxY()` so the north pole aligns ~24px from the top | Vertical offset |
| `--globe-left` | `-0.36 × innerWidth` | Horizontal offset (negative = left of viewport) |

CSS fallbacks use `vh` / `vw` / `vmin` if JS has not run yet.

Metrics update on initial mount, debounced window resize (200 ms), and after fullscreen changes (double `requestAnimationFrame`).

### Styling

Default (delegate login) — purple on lavender:

| Class | Appearance |
|-------|------------|
| `.globe-meridian`, `.globe-parallel` | 1px stroke, `rgba(108, 52, 131, 0.38)` |
| `.globe-outline`, `.globe-rim` | 1.5px stroke, `rgba(108, 52, 131, 0.55)` |
| `.globe-dot` | Fill `rgb(108, 52, 131)` at 0.34–0.92 opacity (pulsing) |

Admin bootstrap (`.login-theme-admin`) uses the same geometry with white strokes and dots.

`vector-effect: non-scaling-stroke` keeps line width consistent when the SVG scales to `--globe-size`.

---

## Indicator globe

The indicator globe sits in the committee workspace header beside “PantherMUNC Command”. It is small (42×42 px by default), white on the purple header, and acts as a visual event indicator alongside the header dot matrix.

### Geometry

The indicator globe uses a **sparse grid** and **continent outlines** instead of dots:

| Element | Login globe | Indicator globe |
|---------|-------------|-----------------|
| Meridians | 24 | 6 |
| Parallels | 11 latitudes | ±45° only |
| Land | ~150 pulsing dots | `CONTINENT_OUTLINES` stroke paths |
| Grid over land | Full grid | Clipped — only ocean segments render |
| Rim | Yes | Yes |

Land clipping passes `isLandPoint` as `landClip` into `meridianPath` and `parallelPath`. Segments that fall on land (or cross into land) are subdivided and dropped so grid lines appear only over water.

Continent coastlines are drawn with `continentOutlinePath`, which densifies each outline ring and projects only front-facing segments.

### Event flashes

`HeaderGlobeFlashProvider` holds flash state. `triggerFlash(kind)` sets the active flash for 1100 ms and bumps `flashKey` so repeated events of the same type still retrigger the animation.

| Flash kind | Color | Trigger |
|------------|-------|---------|
| `pass` | Green | Motion or document status changes to `passed` / `adopted` (`HeaderGlobeFlashWatcher`) |
| `fail` | Red | Motion or document status changes to `failed` |
| `notification` | Blue | New admin notification arrives on a committee page (`NotificationBanner` in `AppShell.tsx`) |
| `timer` | Yellow | Any countdown hits zero (`useCountdown`, `useSessionTimers`) |

During a flash, CSS keyframe animations recolor the grid, rim, outline, and continent strokes. Peak colors are fully opaque and saturated (e.g. green `#4ade80`, red `#f87171`, blue `#60a5fa`, yellow `#facc15`).

### Flash animation without rotation reset

Re-triggering a flash must **not** remount the globe — remounting resets the spin phase. Instead:

1. `flashKey` increments on each `triggerFlash` call.
2. A `useEffect` in `RotatingGlobe` removes all flash classes, forces reflow (`void el.offsetWidth`), then re-adds the active class.
3. The `requestAnimationFrame` spin loop keeps running uninterrupted.

### Header dot matrix

`HeaderDotMatrix` renders a canvas of softly twinkling dots behind the header (`opacity: 0.55`). When any indicator flash fires, qualifying dots receive a synchronized brightness boost for 1100 ms — the same duration as the globe flash.

---

## Projection math

All geometry goes through functions in `globe-projection.ts`. The entry point for points is `projectPoint(latDeg, lonDeg, rotYDeg)`.

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

`northPoleViewBoxY()` returns the projected Y of the north pole at `rotY = 0`. Because spin is around Y, this value is constant and used for login-globe vertical alignment.

### Curves

| Element | Function | How it is sampled |
|---------|----------|-------------------|
| Meridians | `meridianPath(lon, rotY, landClip?)` | Full great circle: latitude -90° → 270°, 120 steps |
| Parallels | `parallelPath(lat, rotY, landClip?)` | Longitude 0° → 360°, 120 steps |
| Outline (equator) | `parallelPath(0, rotY, landClip?)` | Same as the 0° parallel |
| Continent outlines | `continentOutlinePath(ring, rotY)` | Densified coast traces, front hemisphere only |
| Login dots | `projectPoint(lat, lon, rotY)` | One point per dot |

**Meridian note:** Sampling only latitude -90° → 90° draws half a great circle. The visible “missing half” of longitude lines was fixed by tracing the full 360° meridian loop.

**Land clipping note:** When `landClip` is provided (indicator globe only), `appendVisibleSegment` recursively subdivides segments that cross land boundaries and omits segments on land. Max recursion depth is 8; minimum arc before subdivision is 0.4°.

**Equator note:** The `lat = 0` parallel is used as the outline ring. Non-zero parallels come from `PARALLELS` in `globe-continents.ts`; `0` is filtered out in the login component to avoid drawing the equator twice.

---

## Static data (`globe-continents.ts`)

- `MERIDIAN_COUNT = 24` — login globe meridians every 7.5°
- `PARALLELS` — latitudes at ±75, ±60, ±45, ±30, ±15, and 0
- `CONTINENT_OUTLINES` — simplified coast rings from Natural Earth 110m (CC0); used for indicator outlines and land clipping
- `isLandPoint(lat, lon)` — point-in-polygon test against all outline rings
- `CONTINENT_DOTS` — ~150 seeded random land dots (`sampleIrregularLandDots`, min spacing 2.8°) for the login globe

Colors and opacities are defined in CSS, not in this data file.

---

## Compositing isolation

```css
.globe-scene,
.header-globe-scene {
  contain: strict;
}

.globe-scene {
  transform: translateZ(0);
}

.login-panel {
  transform: translateZ(0);
  isolation: isolate;
}
```

The globe and login form sit on separate compositor layers so SVG updates should not repaint the form every frame.

---

## Flickering: causes and fixes

Flicker on the login page usually means something is forcing **cross-layer repaints** or **unstable layout** during animation. Below is what we hit in development and what to avoid when changing either globe.

### 1. CSS 3D with many DOM layers (original implementation)

**Symptom:** Globe lines, dots, and even the login card flicker together, especially in fullscreen.

**Cause:** Dozens of `div` rings using `border`, `transform-style: preserve-3d`, and a spinning parent.

**Fix:** SVG + `requestAnimationFrame` projection (current approach).

### 2. Remounting the globe on login state changes

**Symptom:** Whole login screen flashes in and out on reload.

**Cause:** Globe wrapped inside a shell that unmounted between Suspense fallback, auth loading, and form render.

**Fix:** Mount `<RotatingGlobe />` in `LoginLayoutShell`, not inside conditional page content.

### 3. Remounting the indicator globe on flash

**Symptom:** Indicator globe jumps to a new rotation angle on every event flash.

**Cause:** Using `key={flashKey}` on `<RotatingGlobe>` to restart CSS animations.

**Fix:** Toggle flash CSS classes in a `useEffect` with forced reflow; keep the component mounted.

### 4. Viewport-relative sizing during resize / fullscreen

**Symptom:** Login globe and UI jump or flicker when entering fullscreen or resizing.

**Cause:** Sizing/position with `vmin`, `%`, or container queries recalculating on every resize event.

**Fix:** Set `--globe-size`, `--globe-bottom`, and `--globe-left` in pixels from JS; debounce resize; remeasure fullscreen after layout settles.

### 5. Missing half of meridians (SVG projection bug)

**Symptom:** Longitude lines on one hemisphere only.

**Cause:** Meridians sampled latitude -90° → 90° (front semicircle only).

**Fix:** Sample latitude -90° → 270° along the full great circle in `meridianPath`.

---

## Debugging checklist

If flicker or visual glitches return after a change:

1. **Is the globe still SVG?** If someone reintroduces CSS 3D rings, expect compositor issues.
2. **Does the login card flicker too?** Likely a full-page repaint — check `contain`, or shared animated transforms on a parent.
3. **Does it only happen on fullscreen/resize?** Check `applyGlobeMetrics` timing and debouncing (login globe only).
4. **Does the whole login globe flash on reload?** Check whether `RotatingGlobe` remounts (layout vs. page).
5. **Does the indicator globe jump on event flash?** Check for `key=` on `RotatingGlobe`; use class toggling instead.
6. **Does an indicator flash not replay?** Check that `flashKey` increments and the class-toggle effect runs.

---

## Safe change guidelines

- **Login globe colors / opacity:** Edit `.globe-*` and `.login-theme-admin .globe-*` rules in `globals.css`.
- **Indicator globe colors / flash peaks:** Edit `.header-globe-theme` and `.globe-flash-*` rules in `globals.css`.
- **Spin speed:** Change `SPIN_MS` in `RotatingGlobe.tsx` (both variants).
- **Tilt angle:** Change `TILT_X` / `TILT_Z` in `globe-projection.ts`.
- **Login grid density:** Adjust `MERIDIAN_COUNT` or `PARALLELS` in `globe-continents.ts`.
- **Indicator grid density:** Adjust `HEADER_MERIDIAN_COUNT` or `HEADER_PARALLELS` in `RotatingGlobe.tsx`.
- **Land outlines / dots:** Edit `CONTINENT_OUTLINES` or the `sampleIrregularLandDots` call in `globe-continents.ts`.
- **Login position / scale:** Update `applyGlobeMetrics()` and CSS fallbacks together.
- **Indicator size:** Pass `size` to `<RotatingGlobe variant="header" />` in `Header.tsx`.
- **Flash duration:** Change `FLASH_MS` in `HeaderGlobeFlashContext.tsx` and matching CSS animation durations (1100 ms).
- **Performance:** Keep one SVG and one rAF loop per globe instance; avoid per-frame React state updates for path data.

---

## Related Turbopack warning

Running `next dev` from this repo may log a warning about multiple `package-lock.json` files (parent directory vs. `panthermunc-command/`). That is unrelated to globe rendering. Setting `turbopack.root` in `next.config.ts` was attempted to silence it but broke SWC helper resolution in Next.js 16.2.9; leave the warning alone unless upgrading Next.js and retesting that config.
