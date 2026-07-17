"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
} from "@react-three/drei";
import { BackSide, CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useTheme } from "@/context/ThemeContext";
import { getWorldPalette } from "@/lib/world-theme";
import { FLOOR_Y } from "@/lib/world-layout";
import { subscribeWorldCubeDragging } from "@/lib/world-drag";
import { FloatingGlyphField } from "@/components/world/FloatingGlyphField";
import { WorldHud } from "@/components/world/WorldHud";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function SceneLights({
  ambient,
  sun,
  sunIntensity,
  hemiSky,
  hemiGround,
  hemiIntensity,
}: {
  ambient: number;
  sun: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
}) {
  return (
    <>
      <ambientLight intensity={ambient} />
      <directionalLight
        castShadow
        position={[5, 12, 6]}
        intensity={sunIntensity}
        color={sun}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.55} color="#dff4ff" />
      <hemisphereLight args={[hemiSky, hemiGround, hemiIntensity]} />
    </>
  );
}

function Exposure({ value }: { value: number }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
}

function CameraRig({
  mode,
}: {
  mode: "constellation" | "chamber";
}) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const [cubeDragging, setCubeDragging] = useState(false);

  useEffect(() => subscribeWorldCubeDragging(setCubeDragging), []);

  useEffect(() => {
    if (mode === "chamber") {
      camera.position.set(0, 3.2, 9.5);
      controls.current?.target.set(0, 1.0, 0);
    } else {
      camera.position.set(0, 2.8, 11);
      controls.current?.target.set(0, 1.2, 0);
    }
    controls.current?.update();
  }, [mode, camera]);

  useEffect(() => {
    if (controls.current) {
      controls.current.enabled = !cubeDragging;
    }
  }, [cubeDragging]);

  return (
    <OrbitControls
      ref={controls}
      enablePan
      enableZoom
      enableRotate={mode === "chamber"}
      maxPolarAngle={Math.PI * 0.48}
      minPolarAngle={Math.PI * 0.28}
      minDistance={mode === "chamber" ? 5 : 6}
      maxDistance={mode === "chamber" ? 16 : 18}
      panSpeed={0.9}
      zoomSpeed={0.7}
      rotateSpeed={0.45}
      dampingFactor={0.08}
      enableDamping
      screenSpacePanning
    />
  );
}

/** Soft Frutiger sky dome — bright white → soft cyan. */
function SkyDome({ top, bottom }: { top: string; bottom: string }) {
  return (
    <mesh scale={[-1, 1, 1]} position={[0, 4, 0]}>
      <sphereGeometry args={[48, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        uniforms={{
          topColor: { value: hexToVec3(top) },
          bottomColor: { value: hexToVec3(bottom) },
        }}
        vertexShader={`
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition).y;
            float t = clamp(h * 0.55 + 0.55, 0.0, 1.0);
            gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
          }
        `}
      />
    </mesh>
  );
}

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255,
  ];
}

/** WaraWara-style bright grid floor — hard reference at FLOOR_Y. */
function PlazaFloor({
  ground,
  accent,
}: {
  ground: string;
  accent: string;
}) {
  const map = useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, size, size);

    const cell = 32;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.25;
    ctx.globalAlpha = 0.55;
    for (let x = 0; x <= size; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += cell) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(size, y + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (let y = cell / 2; y < size; y += cell) {
      for (let x = cell / 2; x < size; x += cell) {
        const g = ctx.createRadialGradient(x, y, 1, x, y, cell * 0.28);
        g.addColorStop(0, "rgba(255,255,255,0.55)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const vig = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.18,
      size / 2,
      size / 2,
      size * 0.55
    );
    vig.addColorStop(0, "rgba(255,255,255,0)");
    vig.addColorStop(1, "rgba(255,255,255,0.42)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, size, size);

    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(7, 7);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, [ground, accent]);

  useEffect(() => {
    return () => {
      map.dispose();
    };
  }, [map]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, FLOOR_Y, 0]}
      receiveShadow
    >
      <circleGeometry args={[28, 72]} />
      <meshPhysicalMaterial
        map={map}
        color="#ffffff"
        roughness={0.28}
        metalness={0}
        clearcoat={0.65}
        clearcoatRoughness={0.28}
        envMapIntensity={0.7}
      />
    </mesh>
  );
}

export function WorldSceneInner({
  mode = "constellation",
  children,
  showFloaters = true,
}: {
  mode?: "constellation" | "chamber";
  children: ReactNode;
  showFloaters?: boolean;
}) {
  const { theme } = useTheme();
  const palette = useMemo(() => getWorldPalette(theme), [theme]);
  const reduced = useReducedMotion();

  return (
    <>
      <Exposure value={palette.exposure} />
      <color attach="background" args={[palette.clear]} />
      <fog attach="fog" args={[palette.fog, palette.fogNear, palette.fogFar]} />
      <SkyDome top="#ffffff" bottom="#e8f4fb" />
      <SceneLights
        ambient={palette.ambient}
        sun={palette.sun}
        sunIntensity={palette.sunIntensity}
        hemiSky={palette.hemiSky}
        hemiGround={palette.hemiGround}
        hemiIntensity={palette.hemiIntensity}
      />
      <Environment preset="apartment" environmentIntensity={palette.envIntensity} />
      <CameraRig mode={mode} />

      <PlazaFloor ground={palette.ground} accent={palette.groundAccent} />

      <ContactShadows
        position={[0, FLOOR_Y + 0.015, 0]}
        opacity={palette.shadowOpacity}
        scale={28}
        blur={3.4}
        far={12}
        color={palette.shadowColor}
      />

      {showFloaters && (
        <FloatingGlyphField palette={palette} reducedMotion={reduced} />
      )}

      {children}
    </>
  );
}

export function WorldStage({
  title,
  subtitle,
  hint,
  onBack,
  backLabel,
  actions,
  mode = "constellation",
  children,
  overlay,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  hint?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
  mode?: "constellation" | "chamber";
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const [zooming, setZooming] = useState(false);
  const { theme } = useTheme();
  const palette = useMemo(() => getWorldPalette(theme), [theme]);

  const runSelect = useCallback((fn: () => void) => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      fn();
      return;
    }
    setZooming(true);
    window.setTimeout(() => {
      fn();
      setZooming(false);
    }, 220);
  }, []);

  return (
    <div
      className={`world-stage home-stage ${zooming ? "is-zooming" : ""}`}
      role="region"
      aria-label="Explorable world"
      style={{ background: palette.clear }}
    >
      <Canvas
        className="world-canvas"
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [0, 2.8, 11], fov: 42, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          toneMappingExposure: palette.exposure,
        }}
      >
        <WorldSceneInner mode={mode}>{children}</WorldSceneInner>
      </Canvas>

      <WorldHud
        title={title}
        subtitle={subtitle}
        hint={hint}
        onBack={onBack}
        backLabel={backLabel}
        actions={actions}
      />

      {overlay}

      <WorldSelectBridge runSelect={runSelect} />
    </div>
  );
}

function WorldSelectBridge({
  runSelect,
}: {
  runSelect: (fn: () => void) => void;
}) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ action: () => void }>).detail;
      if (detail?.action) runSelect(detail.action);
    };
    window.addEventListener("world-cube-select", handler);
    return () => window.removeEventListener("world-cube-select", handler);
  }, [runSelect]);
  return null;
}

export function requestWorldSelect(action: () => void) {
  window.dispatchEvent(
    new CustomEvent("world-cube-select", { detail: { action } })
  );
}
