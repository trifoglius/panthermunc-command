import {
  CONTINENT_DOTS,
  MERIDIAN_COUNT,
  PARALLELS,
} from "@/components/login/globe-continents";

function parallelTransform(latDeg: number) {
  const lat = (latDeg * Math.PI) / 180;
  const y = -Math.sin(lat) * 50;
  const scale = Math.cos(lat);
  return `translateY(${y}%) rotateX(90deg) scale(${scale})`;
}

export function RotatingGlobe() {
  return (
    <div className="globe-scene" aria-hidden>
      <div className="globe-shell">
        <div className="globe">
          <div className="globe-ring globe-outline" />

          {Array.from({ length: MERIDIAN_COUNT }, (_, i) => (
            <div
              key={`meridian-${i}`}
              className="globe-ring globe-meridian"
              style={{ transform: `rotateY(${i * (180 / MERIDIAN_COUNT)}deg)` }}
            />
          ))}

          {PARALLELS.map((lat) => (
            <div
              key={`parallel-${lat}`}
              className="globe-ring globe-parallel"
              style={{ transform: parallelTransform(lat) }}
            />
          ))}

          {CONTINENT_DOTS.map(([lat, lon], i) => (
            <div
              key={`dot-${i}`}
              className="globe-dot"
              style={
                {
                  "--lat": lat,
                  "--lon": `${lon}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
