"use client";

import { useState } from "react";
import { DelegateManager } from "@/components/delegates/DelegateManager";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import {
  CommitteeNav,
  type TabId,
} from "@/components/layout/CommitteeNav";
import { Header } from "@/components/layout/Header";
import { MotionPanel } from "@/components/motions/MotionPanel";
import { MotionQueuesPanel } from "@/components/motions/MotionQueuesPanel";
import { PointsPanel } from "@/components/points/PointsPanel";
import { RollCallPanel } from "@/components/rollcall/RollCallPanel";
import { ScoringPanel } from "@/components/scoring/ScoringPanel";
import { StatsPanel } from "@/components/stats/StatsPanel";
import { Button, Card, Input, Select } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import type { CommitteeType } from "@/lib/types";

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
            onChange={(e) => setYear(Number(e.target.value))}
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

function CommitteeWorkspace() {
  const { activeCommittee } = useConference();
  const [activeTab, setActiveTab] = useState<TabId>("rollcall");

  if (!activeCommittee) return null;

  const panels: Record<TabId, React.ReactNode> = {
    rollcall: <RollCallPanel />,
    motions: <MotionPanel />,
    motion_queues: <MotionQueuesPanel />,
    documents: <DocumentPanel />,
    delegates: <DelegateManager />,
    points: <PointsPanel />,
    scoring: <ScoringPanel />,
    stats: <StatsPanel />,
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
        </div>
        {panels[activeTab]}
      </main>
    </>
  );
}

export default function Home() {
  const { user, authLoading } = useAuth();
  const { conference, loading, activeCommittee, syncError, clearSyncError } =
    useConference();

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

      {noCommittees ? (
        user?.role === "admin" ? (
          <AdminSetupScreen />
        ) : (
          <div className="mx-auto max-w-2xl px-4 py-12 text-center">
            <p className="text-xl font-semibold text-purple-900">
              No committees yet
            </p>
            <p className="mt-2 text-purple-600">
              Ask your conference admin to set up the conference.
            </p>
          </div>
        )
      ) : (
        <CommitteeWorkspace />
      )}

      {!activeCommittee &&
        conference &&
        conference.committees.length > 0 &&
        user?.role === "admin" && (
          <div className="mx-auto max-w-7xl px-4 py-6">
            <p className="text-purple-700">Select a committee above to begin.</p>
          </div>
        )}
    </div>
  );
}
