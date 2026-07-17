"use client";

import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { useHeaderGlobeFlash } from "@/context/HeaderGlobeFlashContext";
import { Button } from "@/components/ui";
import { HeaderAtmosphere } from "@/components/layout/HeaderAtmosphere";
import { RotatingGlobe } from "@/components/login/RotatingGlobe";

export function Header({
  compact = true,
}: {
  /** Kept for API compat; header is always thin — ops live in world cubes. */
  compact?: boolean;
}) {
  const { user, logout, authLoading } = useAuth();
  const { conference } = useConference();
  const { flash, flashKey, sustainedFlash } = useHeaderGlobeFlash();

  return (
    <header
      className={`theme-header relative border-[color:var(--header-border)] bg-[var(--header-bg)] ${
        compact
          ? "header-floating header-compact border"
          : "border-b shadow-sm"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <HeaderAtmosphere />
      </div>
      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <RotatingGlobe
            variant="header"
            flash={flash}
            flashKey={flashKey}
            sustainedFlash={sustainedFlash}
            size={compact ? 36 : 42}
          />
          <div className="min-w-0">
            <h1
              className={`truncate font-bold ${compact ? "text-base md:text-lg" : "text-lg md:text-xl"}`}
            >
              PantherMUNC
            </h1>
            <p className="truncate text-xs text-[color:var(--header-muted)] md:text-sm">
              {conference
                ? `${conference.name} ${conference.year}`
                : "Conference Management"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!authLoading && (
            <div
              className={`flex items-center gap-2 ${user ? "border-l border-[color:var(--header-border)] pl-2" : ""}`}
            >
              {user && (
                <span className="hidden text-xs text-[color:var(--header-muted)] sm:inline">
                  {user.displayName}{" "}
                  <span className="rounded bg-[color:var(--role-badge-bg)] px-1 py-0.5 text-[color:var(--role-badge-fg)]">
                    {user.role}
                  </span>
                </span>
              )}
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="!border-transparent !bg-transparent !text-[color:var(--header-muted)] hover:!bg-white/15 hover:!text-[color:var(--header-fg)]"
                >
                  Sign Out
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
