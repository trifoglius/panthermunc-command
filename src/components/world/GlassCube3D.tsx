"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox, Html } from "@react-three/drei";
import { Plane, Vector3, type Group, type Mesh } from "three";
import {
  CUBE_BOB_AMPLITUDE,
  CUBE_SIZE,
  FLOOR_Y,
  clampCubeCenterY,
  type CubeDepth,
} from "@/lib/world-layout";
import { setWorldCubeDragging } from "@/lib/world-drag";
import type { WorldPalette } from "@/lib/world-theme";

const SIZE = CUBE_SIZE;
const DRAG_THRESHOLD_PX = 6;
const DRAG_LIFT = 0.22;

/** Frutiger Aero glass — high transmission, cyan tint, not opaque white. */
function GlassMaterial({
  palette,
  selected,
  color,
  depthOpacity,
}: {
  palette: WorldPalette;
  selected: boolean;
  color?: string;
  depthOpacity: number;
}) {
  return (
    <meshPhysicalMaterial
      color={color ?? palette.cube}
      emissive={selected ? palette.accent : "#ffffff"}
      emissiveIntensity={selected ? 0.28 : 0.06}
      roughness={0.04}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.04}
      transmission={0.94}
      thickness={1.45}
      ior={1.48}
      transparent
      opacity={depthOpacity}
      envMapIntensity={2.8}
      attenuationColor="#9fd4ea"
      attenuationDistance={2.8}
      specularIntensity={1.15}
    />
  );
}

export function GlassCube3D({
  position,
  label,
  icon,
  badge,
  selected = false,
  depth = "mid",
  bobDelayMs = 0,
  enterDelayMs = 0,
  palette,
  reducedMotion = false,
  color,
  draggable = false,
  onSelect,
  onPositionChange,
}: {
  position: [number, number, number];
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  selected?: boolean;
  depth?: CubeDepth;
  bobDelayMs?: number;
  enterDelayMs?: number;
  palette: WorldPalette;
  reducedMotion?: boolean;
  color?: string;
  draggable?: boolean;
  onSelect: () => void;
  onPositionChange?: (next: [number, number, number]) => void;
}) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const hitPoint = useMemo(() => new Vector3(), []);
  const pointer = useRef({
    active: false,
    dragged: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    floatY: position[1],
  });
  const { camera, gl, raycaster, pointer: ndc } = useThree();

  const phase = useMemo(() => (bobDelayMs / 1000) * Math.PI * 2, [bobDelayMs]);
  const enterAt = useMemo(
    () => performance.now() + enterDelayMs,
    [enterDelayMs]
  );

  const depthOpacity = depth === "far" ? 0.8 : depth === "near" ? 0.96 : 0.9;
  const showRim = selected || hovered || dragging;

  const projectToPlane = () => {
    dragPlane.constant = -pointer.current.floatY;
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(dragPlane, hitPoint)) {
      return hitPoint;
    }
    return null;
  };

  const finishPointer = (wasDragged: boolean) => {
    if (!pointer.current.active) return;
    pointer.current.active = false;
    pointer.current.dragged = false;
    if (draggingRef.current) {
      draggingRef.current = false;
      setDragging(false);
    }
    setWorldCubeDragging(false);
    document.body.style.cursor = hovered ? (draggable ? "grab" : "pointer") : "auto";
    if (!wasDragged) onSelect();
  };

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const entered = performance.now() >= enterAt;
    const targetScale = entered ? (draggingRef.current ? 1.06 : 1) : 0.01;
    g.scale.lerp(
      { x: targetScale, y: targetScale, z: targetScale } as never,
      0.12
    );

    g.position.x = position[0];
    g.position.z = position[2];

    if (draggingRef.current) {
      g.position.y = clampCubeCenterY(position[1] + DRAG_LIFT);
      g.rotation.y = 0;
    } else if (!reducedMotion && entered) {
      const bob = Math.sin(t * 1.4 + phase) * CUBE_BOB_AMPLITUDE;
      g.position.y = clampCubeCenterY(position[1] + bob);
      g.rotation.y = Math.sin(t * 0.35 + phase) * 0.12;
    } else {
      g.position.y = clampCubeCenterY(position[1]);
    }

    if (shadow.current) {
      shadow.current.position.y = FLOOR_Y + 0.02 - g.position.y;
      const s = draggingRef.current ? 1.15 : 1;
      shadow.current.scale.setScalar(s);
    }

    if (mesh.current) {
      const hoverBoost = hovered && !draggingRef.current ? 1.06 : 1;
      const selBoost = selected ? 1.04 : 1;
      mesh.current.scale.setScalar(hoverBoost * selBoost);
    }
  });

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!draggable) return;
    e.stopPropagation();
    gl.domElement.setPointerCapture(e.pointerId);
    pointer.current = {
      active: true,
      dragged: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      floatY: clampCubeCenterY(position[1]),
    };
    setWorldCubeDragging(true);
    document.body.style.cursor = "grabbing";
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!pointer.current.active || !draggable) return;
    e.stopPropagation();
    const dx = e.clientX - pointer.current.startX;
    const dy = e.clientY - pointer.current.startY;
    if (
      !pointer.current.dragged &&
      Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX
    ) {
      pointer.current.dragged = true;
      draggingRef.current = true;
      setDragging(true);
    }
    if (!pointer.current.dragged) return;
    const hit = projectToPlane();
    if (hit && onPositionChange) {
      onPositionChange([
        hit.x,
        clampCubeCenterY(pointer.current.floatY),
        hit.z,
      ]);
    }
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!draggable) {
      e.stopPropagation();
      onSelect();
      return;
    }
    if (!pointer.current.active) return;
    e.stopPropagation();
    try {
      gl.domElement.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    finishPointer(pointer.current.dragged);
  };

  return (
    <group ref={group} position={position}>
      <RoundedBox
        ref={mesh}
        args={[SIZE, SIZE, SIZE]}
        radius={0.2}
        smoothness={5}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = draggable ? "grab" : "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          if (!pointer.current.active) {
            document.body.style.cursor = "auto";
          }
        }}
        onPointerDown={draggable ? onPointerDown : undefined}
        onPointerMove={draggable ? onPointerMove : undefined}
        onPointerUp={onPointerUp}
        onPointerCancel={(e) => {
          if (!draggable || !pointer.current.active) return;
          e.stopPropagation();
          finishPointer(true);
        }}
        onClick={
          draggable
            ? undefined
            : (e) => {
                e.stopPropagation();
                onSelect();
              }
        }
      >
        <GlassMaterial
          palette={palette}
          selected={selected}
          color={color}
          depthOpacity={depthOpacity}
        />
      </RoundedBox>

      <RoundedBox
        args={[SIZE * 1.06, SIZE * 1.06, SIZE * 1.06]}
        radius={0.22}
        smoothness={4}
        raycast={() => null}
      >
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.14}
          roughness={0.05}
          metalness={0}
          clearcoat={1}
          transmission={0.55}
          thickness={0.35}
          depthWrite={false}
          envMapIntensity={1.6}
        />
      </RoundedBox>

      <mesh
        position={[0, SIZE * 0.42, 0]}
        rotation={[-Math.PI / 2.4, 0, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[SIZE * 0.72, SIZE * 0.38]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.72}
          depthWrite={false}
        />
      </mesh>

      {showRim && (
        <RoundedBox
          args={[SIZE * 1.08, SIZE * 1.08, SIZE * 1.08]}
          radius={0.22}
          smoothness={3}
          raycast={() => null}
        >
          <meshBasicMaterial
            color={palette.accent}
            transparent
            opacity={selected || dragging ? 0.24 : 0.12}
            depthWrite={false}
          />
        </RoundedBox>
      )}

      <mesh
        ref={shadow}
        position={[0, FLOOR_Y + 0.02 - position[1], 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => null}
      >
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial
          color={palette.shadowColor}
          transparent
          opacity={dragging ? 0.28 : 0.16}
          depthWrite={false}
        />
      </mesh>

      <Html
        center
        distanceFactor={6.5}
        style={{ pointerEvents: "none", userSelect: "none" }}
        zIndexRange={[10, 0]}
      >
        <div className="glass-cube3d-label" aria-hidden>
          {badge != null && badge !== "" && (
            <span className="glass-cube3d-badge">{badge}</span>
          )}
          {icon != null && <span className="glass-cube3d-icon">{icon}</span>}
          <span className="glass-cube3d-text">{label}</span>
        </div>
      </Html>

      <Html position={[0, -1.05, 0]} center style={{ pointerEvents: "auto" }}>
        <button
          type="button"
          className="sr-only"
          aria-pressed={selected || undefined}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {label}
        </button>
      </Html>
    </group>
  );
}
