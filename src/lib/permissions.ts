// Permission keys — safe to import in both server and client code.

export const PERMISSIONS = [
  "conference:manage",
  "users:manage",
  "committee:access_all",
  "committee:operate",
  "scoring:edit",
  "notifications:send",
  "export:all",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

export type UserRole = "admin" | "chair" | "registrar" | "custom";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  chair: "Chair",
  registrar: "Registrar",
  custom: "Custom",
};

export const PERMISSION_META: Record<
  Permission,
  { label: string; description: string }
> = {
  "conference:manage": {
    label: "Manage conference",
    description: "Edit conference settings, create/delete committees",
  },
  "users:manage": {
    label: "Manage users",
    description: "Create and edit user accounts",
  },
  "committee:access_all": {
    label: "Access all committees",
    description: "View and switch between every committee",
  },
  "committee:operate": {
    label: "Operate committee",
    description: "Run roll call, motions, documents, delegates, and points",
  },
  "scoring:edit": {
    label: "Edit score sheets",
    description: "Input and modify awards scoring for committees",
  },
  "notifications:send": {
    label: "Send notifications",
    description: "Broadcast messages to chairs",
  },
  "export:all": {
    label: "Export full conference",
    description: "Download Excel export for all committees",
  },
};

export const ROLE_TEMPLATES: Record<Exclude<UserRole, "custom">, Permission[]> =
  {
    admin: ALL_PERMISSIONS,
    chair: ["committee:operate", "scoring:edit"],
    registrar: ["committee:access_all", "scoring:edit"],
  };

export function permissionsForRole(
  role: UserRole,
  custom?: Permission[]
): Permission[] {
  if (role === "custom") return normalizePermissions(custom ?? []);
  return [...ROLE_TEMPLATES[role]];
}

export function normalizePermissions(perms: string[]): Permission[] {
  const valid = new Set(ALL_PERMISSIONS);
  return [...new Set(perms.filter((p): p is Permission => valid.has(p as Permission)))];
}

export function hasPermission(
  session: { permissions: Permission[] },
  perm: Permission
): boolean {
  return session.permissions.includes(perm);
}

export function hasAnyPermission(
  session: { permissions: Permission[] },
  perms: Permission[]
): boolean {
  return perms.some((p) => hasPermission(session, p));
}

export function canAccessAllCommittees(session: {
  permissions: Permission[];
}): boolean {
  return hasPermission(session, "committee:access_all");
}

export function canOperateCommittee(
  session: { permissions: Permission[]; committeeId: string | null },
  committeeId: string
): boolean {
  if (!hasPermission(session, "committee:operate")) return false;
  if (hasPermission(session, "committee:access_all")) return true;
  return session.committeeId === committeeId;
}

export function canEditScoring(
  session: { permissions: Permission[]; committeeId: string | null },
  committeeId: string
): boolean {
  if (!hasPermission(session, "scoring:edit")) return false;
  if (hasPermission(session, "committee:access_all")) return true;
  return session.committeeId === committeeId;
}

/** Scoring-related fields a registrar may update without full committee operate access. */
export const SCORING_DATA_KEYS = [
  "judgeScores",
  "daisScores",
  "positionPaperScores",
  "vcRecipientId",
  "discrepancyThreshold",
] as const;

export type ScoringDataKey = (typeof SCORING_DATA_KEYS)[number];

export function detectRoleFromPermissions(perms: Permission[]): UserRole {
  const normalized = [...perms].sort().join(",");
  for (const role of ["admin", "chair", "registrar"] as const) {
    const template = [...ROLE_TEMPLATES[role]].sort().join(",");
    if (normalized === template) return role;
  }
  return "custom";
}
