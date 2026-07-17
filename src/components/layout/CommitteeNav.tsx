"use client";

import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { canAccessAllCommittees } from "@/lib/permissions";
import type { TabId } from "@/lib/workspace-url";
import { Button, Select } from "@/components/ui";

export type { TabId };

/** Compact committee switcher — module navigation is via Home Menu cubes. */
export function CommitteeNav({
  onSelectCommittee,
}: {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  onSelectCommittee: (id: string) => void | Promise<void>;
  showTabs?: boolean;
}) {
  const { user } = useAuth();
  const { conference, activeCommittee } = useConference();

  if (!conference || !user) return null;
  if (!canAccessAllCommittees(user)) {
    return activeCommittee ? (
      <nav
        id="committee-nav"
        className="theme-nav border-b border-purple-200"
        aria-label="Committee"
      >
        <div className="mx-auto max-w-7xl px-4 py-3">
          <span className="text-sm font-semibold text-purple-900">
            {activeCommittee.name}
          </span>
        </div>
      </nav>
    ) : null;
  }

  const useDropdown = conference.committees.length > 4;

  return (
    <nav
      id="committee-nav"
      className="theme-nav border-b border-purple-200"
      aria-label="Committee navigation"
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-center gap-2 py-3">
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
        </div>
      </div>
    </nav>
  );
}
