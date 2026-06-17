"use client";

import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { canAccessAllCommittees, hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui";

const TABS = [
  { id: "delegates", label: "Delegates", perm: "committee:operate" as const },
  { id: "rollcall", label: "Roll Call", perm: "committee:operate" as const },
  { id: "motions", label: "Motions", perm: "committee:operate" as const },
  { id: "motion_queues", label: "Motion Queues", perm: "committee:operate" as const },
  { id: "documents", label: "Documents", perm: "committee:operate" as const },
  { id: "scoring", label: "Scoring", perm: "scoring:edit" as const },
  { id: "stats", label: "Stats & Export", perm: "committee:operate" as const },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export function CommitteeNav({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const { user } = useAuth();
  const { conference, activeCommittee, selectCommittee } = useConference();

  if (!conference || !user) return null;

  const showAllCommittees = canAccessAllCommittees(user);
  const visibleTabs = TABS.filter((tab) => hasPermission(user, tab.perm));

  return (
    <nav className="border-b border-purple-200 bg-purple-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-center gap-2 py-3">
          {showAllCommittees ? (
            <>
              <span className="mr-2 text-sm font-medium text-purple-800">
                Committee:
              </span>
              {conference.committees.map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant={
                    activeCommittee?.id === c.id ? "primary" : "secondary"
                  }
                  onClick={() => selectCommittee(c.id)}
                >
                  {c.name}
                </Button>
              ))}
            </>
          ) : (
            activeCommittee && (
              <span className="text-sm font-semibold text-purple-900">
                {activeCommittee.name}
              </span>
            )
          )}
        </div>
        {activeCommittee && visibleTabs.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t border-purple-200 py-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-purple-700 text-white"
                    : "text-purple-800 hover:bg-purple-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
