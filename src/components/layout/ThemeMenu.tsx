"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "@/context/ThemeContext";
import { THEMES } from "@/lib/theme";
import { Button } from "@/components/ui";

export function ThemeMenu({
  buttonClassName = "",
  dock = false,
  dockIcon,
}: {
  buttonClassName?: string;
  dock?: boolean;
  dockIcon?: ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeLabel = THEMES.find((t) => t.id === theme)?.label ?? "Theme";

  return (
    <div className="relative z-20" ref={ref}>
      {dock ? (
        <button
          type="button"
          className={`dock-item dock-item-cyan ${buttonClassName}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`Themes · ${activeLabel}`}
          title={`Themes · ${activeLabel}`}
        >
          {dockIcon ?? "T"}
        </button>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          className={buttonClassName}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          Themes
        </Button>
      )}
      {open && (
        <div
          role="menu"
          aria-label="Color themes"
          className={`theme-menu absolute z-30 mt-1 min-w-[14rem] overflow-hidden py-1 ${
            dock ? "bottom-full right-0 mb-2" : "right-0"
          }`}
        >
          <p className="theme-menu-caption px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide">
            Appearance · {activeLabel}
          </p>
          {THEMES.map((t) => {
            const selected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`theme-menu-item block w-full px-3 py-2 text-left ${
                  selected ? "theme-menu-item-active" : ""
                }`}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
              >
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="theme-menu-desc block text-xs">
                  {t.description}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
