"use client";

import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { canAccessAllCommittees } from "@/lib/permissions";
import { WORKSPACE_TABS, getVisibleTabs, type TabId } from "@/lib/workspace-url";
import { Button, Select, Tabs } from "@/components/ui";

export type { TabId };

export function CommitteeNav({
  activeTab,
  onTabChange,
  onSelectCommittee,
  showTabs = true,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onSelectCommittee: (id: string) => void | Promise<void>;
  showTabs?: boolean;
}) {
  const { user } = useAuth();
  const { conference, activeCommittee } = useConference();

  if (!conference || !user) return null;

  const showAllCommittees = canAccessAllCommittees(user);
  const visibleIds = getVisibleTabs(user);
  const visibleTabs = WORKSPACE_TABS.filter((t) => visibleIds.includes(t.id)).map(
    (t) => ({ id: t.id, label: t.label })
  );
  const useDropdown = showAllCommittees && conference.committees.length > 4;

  return (
    <nav
      id="committee-nav"
      className="theme-nav border-b border-purple-200"
      aria-label="Committee navigation"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-center gap-2 py-3">
          {showAllCommittees ? (
            <>
              <span className="mr-2 text-sm font-medium text-purple-800">
                Committee:
              </span>
              {useDropdown ? (
                <Select
                  label=""
                  aria-label="Select committee"
                  value={activeCommittee?.id ?? ""}
                  onChange={(e) => {
                    if (e.target.value) void onSelectCommittee(e.target.value);
                  }}
                  options={[
                    { value: "", label: "Select committee..." },
                    ...conference.committees.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                  ]}
                  className="max-w-xs"
                />
              ) : (
                conference.committees.map((c) => (
                  <Button
                    key={c.id}
                    size="sm"
                    variant={
                      activeCommittee?.id === c.id ? "primary" : "secondary"
                    }
                    onClick={() => void onSelectCommittee(c.id)}
                  >
                    {c.name}
                  </Button>
                ))
              )}
            </>
          ) : (
            activeCommittee && (
              <span className="text-sm font-semibold text-purple-900">
                {activeCommittee.name}
              </span>
            )
          )}
        </div>

        {showTabs && activeCommittee && visibleTabs.length > 0 && (
          <div className="flex flex-wrap gap-1 border-t border-purple-200 py-2">
            <Tabs
              tabs={visibleTabs}
              activeId={activeTab}
              onChange={(id) => onTabChange(id as TabId)}
              ariaLabel="Workspace tabs"
            />
          </div>
        )}
      </div>
    </nav>
  );
}
