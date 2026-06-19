"use client";

import { Suspense, useState } from "react";
import { DelegateManager } from "@/components/delegates/DelegateManager";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import { CommitteePickerCard } from "@/components/layout/AppShell";
import type { TabId } from "@/components/layout/CommitteeNav";
import { MotionPanel } from "@/components/motions/MotionPanel";
import { MotionQueuesPanel } from "@/components/motions/MotionQueuesPanel";
import { RollCallPanel } from "@/components/rollcall/RollCallPanel";
import { RulesOfProcedurePanel } from "@/components/rules/RulesOfProcedurePanel";
import { ScoringPanel } from "@/components/scoring/ScoringPanel";
import { StatsPanel } from "@/components/stats/StatsPanel";
import { Button, Card, Input, Select } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { useWorkspaceNavigation } from "@/hooks/useWorkspaceNavigation";
import { hasPermission, canAccessAllCommittees } from "@/lib/permissions";
import type { CommitteeType } from "@/lib/types";
import { countPresent } from "@/lib/rollcall";
import { getVoteThresholds } from "@/lib/voting";

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
        <h2 className="text-3xl font-bold text-purple-900">Conference Setup</h2>
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

function VoteThresholds({
  committee,
}: {
  committee: NonNullable<ReturnType<typeof useConference>["activeCommittee"]>;
}) {
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
        Simple majority: {simpleMajority} votes
      </span>
      <span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-900">
        Supermajority: {superMajority} votes
      </span>
    </div>
  );
}

function CommitteeWorkspace() {
  const { activeCommittee } = useConference();
  const { activeTab } = useWorkspaceNavigation();

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
  );
}

function HomeContent() {
  const { user, logout } = useAuth();
  const { conference, conferenceUnavailable, activeCommittee } = useConference();

  const noCommittees = !conference || conference.committees.length === 0;

  if (noCommittees) {
    if (user && hasPermission(user, "conference:manage")) {
      return <AdminSetupScreen />;
    }
    return (
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
    );
  }

  if (!activeCommittee && user && canAccessAllCommittees(user)) {
    return <CommitteePickerCard />;
  }

  return <CommitteeWorkspace />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
