"use client";

import { useConference } from "@/context/ConferenceContext";
import { Button } from "@/components/ui";

const TABS = [
  { id: "rollcall", label: "Roll Call" },
  { id: "motions", label: "Motions" },
  { id: "documents", label: "Documents" },
  { id: "delegates", label: "Delegates" },
  { id: "scoring", label: "Scoring" },
  { id: "stats", label: "Stats & Export" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export function CommitteeNav({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const { conference, activeCommittee, selectCommittee } = useConference();

  if (!conference) return null;

  return (
    <nav className="border-b border-purple-200 bg-purple-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-center gap-2 py-3">
          <span className="mr-2 text-sm font-medium text-purple-800">
            Committee:
          </span>
          {conference.committees.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={activeCommittee?.id === c.id ? "primary" : "secondary"}
              onClick={() => selectCommittee(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
        {activeCommittee && (
          <div className="flex flex-wrap gap-1 border-t border-purple-200 py-2">
            {TABS.map((tab) => (
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
