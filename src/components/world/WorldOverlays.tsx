"use client";

import { useEffect, useMemo, useState } from "react";
import { THEMES, type ThemeId } from "@/lib/theme";
import { useTheme } from "@/context/ThemeContext";
import { useConference } from "@/context/ConferenceContext";
import { useAuth } from "@/context/AuthContext";
import { Button, useToast } from "@/components/ui";
import { hasPermission } from "@/lib/permissions";
import { exportConferenceLogs } from "@/lib/conference-logs-export";
import {
  exportCommitteeToExcel,
  exportFullConferenceToExcel,
} from "@/lib/excel-export";

export function ThemeOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="world-overlay-root">
      <button
        type="button"
        className="world-overlay-backdrop"
        aria-label="Close theme picker"
        onClick={onClose}
      />
      <div className="world-overlay-panel" role="dialog" aria-label="Theme">
        <h3 className="mb-3 text-lg font-semibold text-[color:var(--purple-dark)]">
          Theme
        </h3>
        <div className="grid gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`world-overlay-choice ${theme === t.id ? "is-active" : ""}`}
              onClick={() => {
                setTheme(t.id as ThemeId);
                onClose();
              }}
            >
              <span className="font-medium">{t.label}</span>
              <span className="block text-xs opacity-70">{t.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExportOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { conference, activeCommittee } = useConference();
  const { success } = useToast();
  const canExportAll = user ? hasPermission(user, "export:all") : false;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="world-overlay-root">
      <button
        type="button"
        className="world-overlay-backdrop"
        aria-label="Close export"
        onClick={onClose}
      />
      <div className="world-overlay-panel" role="dialog" aria-label="Export">
        <h3 className="mb-3 text-lg font-semibold text-[color:var(--purple-dark)]">
          Export
        </h3>
        <div className="grid gap-2">
          {activeCommittee && (
            <Button
              variant="secondary"
              onClick={() => {
                exportCommitteeToExcel(activeCommittee);
                success("Committee Excel exported");
                onClose();
              }}
            >
              Export Committee
            </Button>
          )}
          {canExportAll && conference && (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  exportFullConferenceToExcel(conference);
                  success("Full conference Excel exported");
                  onClose();
                }}
              >
                Export All
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  exportConferenceLogs(conference);
                  success("Conference logs exported");
                  onClose();
                }}
              >
                Export Logs
              </Button>
            </>
          )}
          {!activeCommittee && !canExportAll && (
            <p className="text-sm text-[color:var(--purple-primary)]">
              No export targets available.
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useWorldOverlays() {
  const [overlay, setOverlay] = useState<"theme" | "export" | null>(null);

  const nodes = useMemo(
    () => (
      <>
        <ThemeOverlay
          open={overlay === "theme"}
          onClose={() => setOverlay(null)}
        />
        <ExportOverlay
          open={overlay === "export"}
          onClose={() => setOverlay(null)}
        />
      </>
    ),
    [overlay]
  );

  return {
    overlay,
    openTheme: () => setOverlay("theme"),
    openExport: () => setOverlay("export"),
    close: () => setOverlay(null),
    nodes,
  };
}
