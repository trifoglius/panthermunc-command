import { hasPermission } from "@/lib/permissions";
import type { SessionData } from "@/lib/auth-types";

export const WORKSPACE_TABS = [
  { id: "delegates", label: "Delegates", perm: "committee:operate" as const },
  { id: "attendance", label: "Attendance", perm: "committee:operate" as const },
  { id: "speakers", label: "Speakers", perm: "committee:operate" as const },
  { id: "motions", label: "Motions", perm: "committee:operate" as const },
  { id: "proposals", label: "Proposals", perm: "committee:operate" as const },
  { id: "voting", label: "Voting", perm: "committee:operate" as const },
  {
    id: "history",
    label: "History",
    perm: "committee:operate" as const,
  },
  { id: "stats", label: "Stats", perm: "committee:operate" as const },
] as const;

export type TabId = (typeof WORKSPACE_TABS)[number]["id"];

export const TAB_IDS: TabId[] = WORKSPACE_TABS.map((t) => t.id);

export function isValidTabId(value: string): value is TabId {
  return TAB_IDS.includes(value as TabId);
}

/** Map legacy tab ids from old bookmarks/URLs. */
export function normalizeTabId(value: string | null): string | null {
  if (!value) return null;
  if (value === "rollcall") return "attendance";
  if (value === "documents") return "proposals";
  if (value === "motion_queues") return "history";
  if (value === "rules") return "speakers";
  if (value === "scoring") return "stats";
  return value;
}

export function getVisibleTabs(user: SessionData): TabId[] {
  return WORKSPACE_TABS.filter((tab) =>
    hasPermission(user, tab.perm)
  ).map((t) => t.id);
}

export function getDefaultTab(_user: SessionData): TabId {
  return "speakers";
}

export function resolveActiveTab(
  tabParam: string | null,
  user: SessionData
): TabId {
  const visible = getVisibleTabs(user);
  const normalized = normalizeTabId(tabParam);
  if (normalized && isValidTabId(normalized) && visible.includes(normalized)) {
    return normalized;
  }
  const fallback = getDefaultTab(user);
  return visible.includes(fallback) ? fallback : visible[0] ?? "delegates";
}
