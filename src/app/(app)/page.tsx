"use client";

import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { DelegateManager } from "@/components/delegates/DelegateManager";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import {
  CommitteeNav,
  type TabId,
} from "@/components/layout/CommitteeNav";
import { Header } from "@/components/layout/Header";
import { MotionPanel } from "@/components/motions/MotionPanel";
import { MotionQueuesPanel } from "@/components/motions/MotionQueuesPanel";
import { RollCallPanel } from "@/components/rollcall/RollCallPanel";
import { RulesOfProcedurePanel } from "@/components/rules/RulesOfProcedurePanel";
import { ScoringPanel } from "@/components/scoring/ScoringPanel";
import { StatsPanel } from "@/components/stats/StatsPanel";
import { Button, Card, Input, Select } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { hasPermission, canAccessAllCommittees } from "@/lib/permissions";
import type { CommitteeType } from "@/lib/types";
import { countPresent } from "@/lib/rollcall";
import { getVoteThresholds } from "@/lib/voting";

// Admin-only setup screen shown when no committees exist yet
function AdminSetupScreen() {
  const { conference, initConference, createCommittee } = useConference();
  const [confName, setConfName] = useState(conference?.name ?? "PantherMUNC");
  const [year, setYear] = useState(conference?.year ?? new Date().getFullYear());
  const [committeeName, setCommitteeName] = useState("");
  const [committeeType, setCommitteeType] = useState<CommitteeType>("ga");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!committeeName.trim()) return;
    setSaving(true);
    try {
      // Update conference name/year if changed
      if (
        confName.trim() !== conference?.name ||
        year !== conference?.year
      ) {
        await initConference(confName.trim() || "PantherMUNC", year);
      }
      await createCommittee(committeeName.trim(), committeeType, topic.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-purple-900">
          Conference Setup
        </h2>
        <p className="mt-2 text-purple-700">
          Set up the conference details and create your first committee.
        </p>
      </div>

      <Card title="Conference Details" className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Conference Name"
            value={confName}
            onChange={(e) => setConfName(e.target.value)}
          />
          <Input
            label="Year"
            type="number"
            value={year}
            onChange={(e) => {
              const nextYear = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(nextYear) && nextYear > 0) {
                setYear(nextYear);
              }
            }}
          />
        </div>
      </Card>

      <Card title="Create First Committee">
        <div className="grid gap-3">
          <Input
            label="Committee Name"
            value={committeeName}
            onChange={(e) => setCommitteeName(e.target.value)}
            placeholder="e.g. UN Security Council"
          />
          <Select
            label="Committee Type"
            value={committeeType}
            onChange={(e) =>
              setCommitteeType(e.target.value as CommitteeType)
            }
            options={[
              { value: "ga", label: "General Assembly (GA Rubric)" },
              { value: "crisis", label: "Crisis (Crisis Rubric)" },
              { value: "specialized", label: "Specialized (GA Rubric)" },
            ]}
          />
          <Input
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Committee topic"
          />
          <p className="text-sm text-purple-600">
            GA committees will be pre-loaded with 20 default countries.
          </p>
          <Button onClick={handleCreate} disabled={saving || !committeeName.trim()}>
            {saving ? "Creating..." : "Create Committee & Start"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function VoteThresholds({ committee }: { committee: NonNullable<ReturnType<typeof useConference>["activeCommittee"]> }) {
  const latestRollCall = committee.rollCalls[0] ?? null;
  if (!latestRollCall) return null;

  const votingBase = countPresent(latestRollCall);

  const { simpleMajority, superMajority } = getVoteThresholds(votingBase);

  return (
    <div className="mt-2 flex flex-wrap gap-4 text-sm">
      <span className="text-purple-600">
        Based on latest roll call ({latestRollCall.label}):
      </span>
      <span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-900">
        Simple majority: {simpleMajority} votes ({votingBase} present + P&amp;V)
      </span>
      <span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-900">
        Supermajority ⅔: {superMajority} votes ({votingBase} present + P&amp;V)
      </span>
    </div>
  );
}

function CommitteeWorkspace() {
  const { user } = useAuth();
  const { activeCommittee } = useConference();
  const defaultTab: TabId =
    user &&
    hasPermission(user, "scoring:edit") &&
    !hasPermission(user, "committee:operate")
      ? "scoring"
      : "delegates";
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  if (!activeCommittee) return null;

  const panels: Record<TabId, React.ReactNode> = {
    delegates: <DelegateManager />,
    rollcall: <RollCallPanel />,
    motions: <MotionPanel />,
    motion_queues: <MotionQueuesPanel />,
    documents: <DocumentPanel />,
    scoring: <ScoringPanel />,
    stats: <StatsPanel />,
    rules: <RulesOfProcedurePanel />,
  };

  return (
    <>
      <CommitteeNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-purple-900">
            {activeCommittee.name}
          </h2>
          <p className="text-purple-700">
            {activeCommittee.type.toUpperCase()} ·{" "}
            {activeCommittee.topic || "No topic set"}
          </p>
          <VoteThresholds committee={activeCommittee} />
        </div>
        {panels[activeTab]}
      </main>
    </>
  );
}

export default function Home() {
  const { user, authLoading, logout } = useAuth();
  const {
    conference,
    loading,
    conferenceUnavailable,
    activeCommittee,
    syncError,
    clearSyncError,
  } = useConference();
  // Only chairs and judges (users with an assigned committeeId) receive broadcast
  // notifications. Admins and registrars send them but don't need to poll.
  const { notifications, dismiss, dismissAll } = useNotifications(
    !authLoading && !loading && !!user?.committeeId
  );

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-purple-800">
        Loading...
      </div>
    );
  }

  const noCommittees = !conference || conference.committees.length === 0;

  return (
    <div className="min-h-screen bg-purple-50">
      <Header />

      {syncError && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 flex justify-between items-center">
          <span>{syncError}</span>
          <button
            onClick={clearSyncError}
            className="ml-4 text-yellow-600 hover:text-yellow-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="border-b border-blue-200 bg-blue-50">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-4 border-b border-blue-100 px-4 py-2 last:border-0"
            >
              <div className="flex items-start gap-2 text-sm text-blue-900">
                <span className="mt-0.5 shrink-0 rounded bg-blue-200 px-1.5 py-0.5 text-xs font-semibold text-blue-800">
                  From Admin
                </span>
                <span>{n.message}</span>
              </div>
              <button
                onClick={() => dismiss(n.id)}
                className="shrink-0 text-blue-500 hover:text-blue-900 text-xs"
              >
                Dismiss
              </button>
            </div>
          ))}
          {notifications.length > 1 && (
            <div className="px-4 py-1 text-right">
              <button
                onClick={dismissAll}
                className="text-xs text-blue-600 hover:text-blue-900"
              >
                Dismiss all
              </button>
            </div>
          )}
        </div>
      )}

      {noCommittees ? (
        user && hasPermission(user, "conference:manage") ? (
          <AdminSetupScreen />
        ) : (
          <div className="mx-auto max-w-2xl px-4 py-12 text-center">
            <p className="text-xl font-semibold text-purple-900">
              {conferenceUnavailable
                ? "Conference no longer available"
                : "No committees yet"}
            </p>
            <p className="mt-2 text-purple-600">
              {conferenceUnavailable
                ? "This conference has been removed. Sign out to return to the login page."
                : "Ask your conference admin to set up the conference."}
            </p>
            <div className="mt-6">
              <Button variant="secondary" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </div>
        )
      ) : (
        <CommitteeWorkspace />
      )}

      {!activeCommittee &&
        conference &&
        conference.committees.length > 0 &&
        user &&
        canAccessAllCommittees(user) && (
          <div className="mx-auto max-w-7xl px-4 py-6">
            <p className="text-purple-700">Select a committee above to begin.</p>
          </div>
        )}
    </div>
  );
}
