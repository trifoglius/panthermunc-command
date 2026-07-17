"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import type { Group } from "three";
import type { Vector3Tuple } from "three";
import { useTheme } from "@/context/ThemeContext";
import { getWorldPalette } from "@/lib/world-theme";
import { MIN_CUBE_CENTER_Y, clampCubeCenterY } from "@/lib/world-layout";
import {
  WorldCanvas,
} from "@/components/world/WorldCanvas";

export function EntityTile3D({
  position,
  label,
  sublabel,
  color,
  selected = false,
  scale = [1, 1, 0.35] as Vector3Tuple,
  onSelect,
}: {
  position: Vector3Tuple;
  label: string;
  sublabel?: string;
  color?: string;
  selected?: boolean;
  scale?: Vector3Tuple;
  onSelect: () => void;
}) {
  const { theme } = useTheme();
  const palette = useMemo(() => getWorldPalette(theme), [theme]);
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const bob =
      Math.sin(state.clock.elapsedTime * 1.2 + phase) * 0.05;
    g.position.y = clampCubeCenterY(
      Math.max(position[1] + bob, MIN_CUBE_CENTER_Y)
    );
  });

  return (
    <group ref={group} position={position}>
      <RoundedBox
        args={scale}
        radius={0.08}
        smoothness={3}
        castShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        scale={hovered || selected ? 1.08 : 1}
      >
        <meshPhysicalMaterial
          color={color ?? palette.cube}
          emissive={selected ? palette.accent : "#ffffff"}
          emissiveIntensity={selected ? 0.2 : 0.03}
          roughness={0.08}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.08}
          transmission={0.88}
          thickness={0.9}
          ior={1.45}
          transparent
          opacity={0.9}
          envMapIntensity={2.2}
          attenuationColor="#9fd4ea"
          attenuationDistance={2.5}
        />
      </RoundedBox>
      <Html center distanceFactor={5} style={{ pointerEvents: "none" }}>
        <div className="entity-tile-label">
          <span className="entity-tile-title">{label}</span>
          {sublabel && <span className="entity-tile-sub">{sublabel}</span>}
        </div>
      </Html>
    </group>
  );
}

export function ModuleChamber({
  title,
  subtitle,
  hint = "Orbit to explore · Click an entity to open",
  onBack,
  backLabel = "← Modules",
  actions,
  overlay,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  hint?: string;
  onBack: () => void;
  backLabel?: string;
  actions?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <WorldCanvas
      mode="chamber"
      title={title}
      subtitle={subtitle}
      hint={hint}
      onBack={onBack}
      backLabel={backLabel}
      actions={actions}
      overlay={overlay}
    >
      {children}
    </WorldCanvas>
  );
}

/** Glass sheet overlay for forms — sits above the canvas. */
export function ChamberSheet({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="world-overlay-root">
      <button
        type="button"
        className="world-overlay-backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={`world-overlay-panel chamber-sheet ${wide ? "chamber-sheet-wide" : ""}`}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[color:var(--purple-dark)]">
            {title}
          </h3>
          <button
            type="button"
            className="text-sm text-[color:var(--purple-primary)] underline"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="chamber-sheet-body">{children}</div>
      </div>
    </div>
  );
}
