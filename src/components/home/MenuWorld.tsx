"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { layoutCubePositions } from "@/lib/menu-world-layout";

const DRAG_THRESHOLD = 8;
const PAN_LIMIT = 420;

type GlassCubeLikeProps = {
  depth?: "near" | "mid" | "far";
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  [key: string]: unknown;
};

export function MenuWorld({
  children,
  title,
  subtitle,
  hint = "Drag to look around · Click a cube to open",
  dock,
}: {
  children: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  hint?: string;
  dock?: ReactNode;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [zooming, setZooming] = useState(false);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const items = useMemo(
    () => Children.toArray(children).filter(Boolean),
    [children]
  );
  const positions = useMemo(
    () => layoutCubePositions(items.length),
    [items.length]
  );

  const clampPan = useCallback((x: number, y: number) => {
    return {
      x: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, x)),
      y: Math.max(-PAN_LIMIT, Math.min(PAN_LIMIT, y)),
    };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".menu-world-hud")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d?.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true;
    setPan(clampPan(d.originX + dx, d.originY + dy));
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = { ...d, active: false };
    setDragging(false);
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      setPan((p) =>
        clampPan(p.x - ev.deltaX * 0.65, p.y - ev.deltaY * 0.65)
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampPan]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const step = ev.shiftKey ? 48 : 28;
      if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        setPan((p) => clampPan(p.x + step, p.y));
      } else if (ev.key === "ArrowRight") {
        ev.preventDefault();
        setPan((p) => clampPan(p.x - step, p.y));
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setPan((p) => clampPan(p.x, p.y + step));
      } else if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setPan((p) => clampPan(p.x, p.y - step));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clampPan]);

  const wrapClick = useCallback(
    (original?: (e: MouseEvent<HTMLButtonElement>) => void) =>
      (e: MouseEvent<HTMLButtonElement>) => {
        if (dragRef.current?.moved) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        const reduced =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
          original?.(e);
          return;
        }
        setZooming(true);
        window.setTimeout(() => {
          original?.(e);
          setZooming(false);
        }, 200);
      },
    []
  );

  const stageStyle: CSSProperties = {
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0)${zooming ? " scale(1.06)" : ""}`,
  };

  return (
    <div
      ref={rootRef}
      className={`menu-world home-view ${dragging ? "is-dragging" : ""} ${zooming ? "is-zooming" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="region"
      aria-label="Menu world"
    >
      <div className="menu-world-fog" aria-hidden />
      <div ref={stageRef} className="menu-world-stage" style={stageStyle}>
        <div className="menu-world-ground" aria-hidden />
        {items.map((child, i) => {
          const pos = positions[i] ?? {
            x: 0,
            y: 0,
            z: 0,
            depth: "mid" as const,
          };
          let node = child;
          if (isValidElement(child)) {
            const el = child as ReactElement<GlassCubeLikeProps>;
            node = cloneElement(el, {
              depth: pos.depth,
              onClick: wrapClick(el.props.onClick),
            });
          }
          return (
            <div
              key={i}
              className="menu-world-item"
              style={{
                transform: `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)`,
              }}
            >
              {node}
            </div>
          );
        })}
      </div>

      <div className="menu-world-hud">
        <div className="menu-world-title">
          {title}
          {subtitle}
          <p className="menu-world-hint">{hint}</p>
        </div>
        {dock && <div className="menu-world-dock">{dock}</div>}
      </div>
    </div>
  );
}
