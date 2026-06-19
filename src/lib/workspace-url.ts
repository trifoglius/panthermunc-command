import type { Permission } from "@/lib/permissions";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import type { SessionData } from "@/lib/auth-types";

export const WORKSPACE_TABS = [
  { id: "delegates", label: "Delegates", perm: "committee:operate" as const },
  { id: "rollcall", label: "Roll Call", perm: "committee:operate" as const },
  { id: "motions", label: "Motions", perm: "committee:operate" as const },
  {
    id: "motion_queues",
    label: "Motion Queues",
    perm: "committee:operate" as const,
  },
  { id: "documents", label: "Documents", perm: "committee:operate" as const },
  { id: "scoring", label: "Scoring", perm: "scoring:edit" as const },
  { id: "stats", label: "Stats & Export", perm: "committee:operate" as const },
  {
    id: "rules",
    label: "Rules of Procedure",
    anyOf: ["committee:operate", "scoring:edit"] as Permission[],
  },
] as const;

export type TabId = (typeof WORKSPACE_TABS)[number]["id"];

export const TAB_IDS: TabId[] = WORKSPACE_TABS.map((t) => t.id);

export function isValidTabId(value: string): value is TabId {
  return TAB_IDS.includes(value as TabId);
}

export function getVisibleTabs(user: SessionData): TabId[] {
  return WORKSPACE_TABS.filter((tab) =>
    "perm" in tab
      ? hasPermission(user, tab.perm)
      : hasAnyPermission(user, tab.anyOf)
  ).map((t) => t.id);
}

export function getDefaultTab(user: SessionData): TabId {
  if (
    hasPermission(user, "scoring:edit") &&
    !hasPermission(user, "committee:operate")
  ) {
    return "scoring";
  }
  return "delegates";
}

export function resolveActiveTab(
  tabParam: string | null,
  user: SessionData
): TabId {
  const visible = getVisibleTabs(user);
  if (tabParam && isValidTabId(tabParam) && visible.includes(tabParam)) {
    return tabParam;
  }
  const fallback = getDefaultTab(user);
  return visible.includes(fallback) ? fallback : visible[0] ?? "delegates";
}
