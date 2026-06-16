"use client";

import { useRef, useState } from "react";
import { DelegateManager } from "@/components/delegates/DelegateManager";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import {
  CommitteeNav,
  type TabId,
} from "@/components/layout/CommitteeNav";
import { Header } from "@/components/layout/Header";
import { MotionPanel } from "@/components/motions/MotionPanel";
import { RollCallPanel } from "@/components/rollcall/RollCallPanel";
import { ScoringPanel } from "@/components/scoring/ScoringPanel";
import { StatsPanel } from "@/components/stats/StatsPanel";
import { Button, Card, Input, Select } from "@/components/ui";
import { useConference } from "@/context/ConferenceContext";
import type { CommitteeType } from "@/lib/types";

function SetupScreen() {
  const { initConference, createCommittee, importJson } = useConference();
  const [confName, setConfName] = useState("PantherMUNC");
  const [year, setYear] = useState(new Date().getFullYear());
  const [step, setStep] = useState<"conference" | "committee">("conference");
  const [committeeName, setCommitteeName] = useState("");
  const [committeeType, setCommitteeType] = useState<CommitteeType>("ga");
  const [topic, setTopic] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCreateConference = () => {
    initConference(confName, year);
    setStep("committee");
  };

  const handleCreateCommittee = () => {
    if (!committeeName.trim()) return;
    createCommittee(committeeName.trim(), committeeType, topic.trim());
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await importJson(file);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-purple-900">
          Welcome to PantherMUNC Command
        </h2>
        <p className="mt-2 text-purple-700">
          Your conference management tool — roll call, motions, documents,
          scoring, and Excel export.
        </p>
      </div>

      <Card title="Restore Backup">
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          Import JSON Backup
        </Button>
      </Card>

      {step === "conference" ? (
        <Card title="Create Conference" className="mt-4">
          <div className="grid gap-3">
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
            <Button onClick={handleCreateConference}>
              Continue to Committee Setup
            </Button>
          </div>
        </Card>
      ) : (
        <Card title="Create Your First Committee" className="mt-4">
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
              GA committees will be pre-loaded with 20 default countries. You
              can add or remove delegates after setup.
            </p>
            <Button onClick={handleCreateCommittee}>
              Create Committee &amp; Start
            </Button>
          </div>
        </Card>
      )}
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
    documents: <DocumentPanel />,
    delegates: <DelegateManager />,
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
            {activeCommittee.type.toUpperCase()} · {activeCommittee.topic || "No topic set"}
          </p>
        </div>
        {panels[activeTab]}
      </main>
    </>
  );
}

export default function Home() {
  const { conference, loading, activeCommittee } = useConference();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-purple-800">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50">
      <Header />
      {!conference || conference.committees.length === 0 ? (
        <SetupScreen />
      ) : (
        <CommitteeWorkspace />
      )}
      {!activeCommittee && conference && conference.committees.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 py-6">
          <p className="text-purple-700">Select a committee above to begin.</p>
        </div>
      )}
    </div>
  );
}
