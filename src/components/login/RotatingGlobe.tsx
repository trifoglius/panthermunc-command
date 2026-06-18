const RADIUS = 90;
const CENTER = 100;

const PARALLELS = [-60, -30, 0, 30, 60];
const MERIDIANS = Array.from({ length: 12 }, (_, i) => i * 15);

function parallelRing(latDeg: number) {
  const lat = (latDeg * Math.PI) / 180;
  const cy = CENTER - RADIUS * Math.sin(lat);
  const rx = RADIUS * Math.cos(lat);
  const ry = Math.max(rx * 0.35, 1.5);
  return { cy, rx, ry };
}

export function RotatingGlobe({ className = "" }: { className?: string }) {
  return (
    <div
      className={`globe-tilt pointer-events-none select-none ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-lg">
        <defs>
          <radialGradient id="globeGradient" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#b07cc6" />
            <stop offset="55%" stopColor="#7d3c98" />
            <stop offset="100%" stopColor="#4a235a" />
          </radialGradient>
          <clipPath id="globeClip">
            <circle cx={CENTER} cy={CENTER} r={RADIUS} />
          </clipPath>
        </defs>

        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="url(#globeGradient)"
        />

        <g clipPath="url(#globeClip)">
          {PARALLELS.map((lat) => {
            const { cy, rx, ry } = parallelRing(lat);
            return (
              <ellipse
                key={`parallel-${lat}`}
                cx={CENTER}
                cy={cy}
                rx={rx}
                ry={ry}
                fill="none"
                stroke="rgba(232, 218, 239, 0.75)"
                strokeWidth="1.25"
              />
            );
          })}

          <g className="globe-meridians">
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${CENTER} ${CENTER}`}
              to={`360 ${CENTER} ${CENTER}`}
              dur="20s"
              repeatCount="indefinite"
            />
            {MERIDIANS.map((angle) => {
              const rx = RADIUS * Math.abs(Math.sin((angle * Math.PI) / 180));
              return (
                <ellipse
                  key={`meridian-${angle}`}
                  cx={CENTER}
                  cy={CENTER}
                  rx={Math.max(rx, 0.75)}
                  ry={RADIUS}
                  fill="none"
                  stroke="rgba(232, 218, 239, 0.75)"
                  strokeWidth="1.25"
                />
              );
            })}
          </g>
        </g>

        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="rgba(91, 44, 111, 0.55)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
