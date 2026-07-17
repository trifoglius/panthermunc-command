import type { ReactNode } from "react";
import type { TabId } from "@/lib/workspace-url";

export type WorldCubeKind =
  | "committee"
  | "module"
  | "create"
  | "settings"
  | "users"
  | "export"
  | "theme";

export type WorldCubeDef = {
  id: string;
  kind: WorldCubeKind;
  label: string;
  badge?: string | number;
  selected?: boolean;
  /** Tab id when kind === module */
  tabId?: TabId;
  /** Committee id when kind === committee */
  committeeId?: string;
};

export type WorldOverlayKind = "theme" | "export" | "create" | null;

export function systemCubeDefs(opts: {
  canManageConference: boolean;
  canManageUsers: boolean;
  canExport: boolean;
}): WorldCubeDef[] {
  const cubes: WorldCubeDef[] = [];
  if (opts.canManageConference) {
    cubes.push({ id: "sys-settings", kind: "settings", label: "Settings" });
  }
  if (opts.canManageUsers) {
    cubes.push({ id: "sys-users", kind: "users", label: "Users" });
  }
  if (opts.canExport) {
    cubes.push({ id: "sys-export", kind: "export", label: "Export" });
  }
  cubes.push({ id: "sys-theme", kind: "theme", label: "Theme" });
  return cubes;
}

/** Icon slot filled by callers — catalog stays data-only. */
export type CubeIconMap = Record<string, ReactNode>;
