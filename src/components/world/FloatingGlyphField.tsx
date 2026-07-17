"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { MIN_CUBE_CENTER_Y } from "@/lib/world-layout";
import type { WorldPalette } from "@/lib/world-theme";

type Floater = {
  position: [number, number, number];
  scale: number;
  kind: "sphere" | "box" | "torus";
  speed: number;
  phase: number;
};

function makeFloaters(count: number): Floater[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const radius = 5 + (i % 5) * 1.4;
    const kinds: Floater["kind"][] = ["sphere", "box", "torus"];
    const baseY = Math.max(MIN_CUBE_CENTER_Y + 0.4, 1.4 + (i % 4) * 0.85);
    return {
      position: [
        Math.cos(angle) * radius + Math.sin(i) * 0.8,
        baseY,
        Math.sin(angle) * radius * 0.7 - 2,
      ],
      scale: 0.18 + (i % 4) * 0.08,
      kind: kinds[i % 3],
      speed: 0.25 + (i % 5) * 0.08,
      phase: i * 0.7,
    };
  });
}

export function FloatingGlyphField({
  palette,
  reducedMotion = false,
  count = 18,
}: {
  palette: WorldPalette;
  reducedMotion?: boolean;
  count?: number;
}) {
  const group = useRef<Group>(null);
  const floaters = useMemo(() => makeFloaters(count), [count]);

  useFrame((state) => {
    if (reducedMotion || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const f = floaters[i];
      if (!f) return;
      const bob = Math.sin(t * f.speed + f.phase) * 0.35;
      child.position.y = Math.max(MIN_CUBE_CENTER_Y + 0.25, f.position[1] + bob);
      child.rotation.x = t * 0.2 + f.phase;
      child.rotation.y = t * 0.15 + f.phase;
    });
  });

  return (
    <group ref={group}>
      {floaters.map((f, i) => (
        <mesh
          key={i}
          position={f.position}
          scale={f.scale}
          castShadow={false}
          receiveShadow={false}
        >
          {f.kind === "sphere" && <sphereGeometry args={[1, 24, 24]} />}
          {f.kind === "box" && <boxGeometry args={[1.2, 1.2, 1.2]} />}
          {f.kind === "torus" && <torusGeometry args={[0.7, 0.22, 12, 24]} />}
          <meshPhysicalMaterial
            color={palette.cube}
            emissive="#ffffff"
            emissiveIntensity={0.1}
            roughness={0.08}
            metalness={0}
            clearcoat={1}
            transmission={0.92}
            thickness={0.55}
            transparent
            opacity={0.58}
            depthWrite={false}
            envMapIntensity={2}
          />
        </mesh>
      ))}
    </group>
  );
}
