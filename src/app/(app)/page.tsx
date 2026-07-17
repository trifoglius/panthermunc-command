"use client";

import { Suspense, useState } from "react";
import { CommitteeHome } from "@/components/home/CommitteeHome";
import { ConferenceHome } from "@/components/home/ConferenceHome";
import { PanelStage } from "@/components/home/PanelStage";
import { WorkspaceChamber } from "@/components/world/chambers/WorkspaceChamber";
import { Button, Card, Input, Modal, Select } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { useWorkspaceNavigation } from "@/hooks/useWorkspaceNavigation";
import { hasPermission, canAccessAllCommittees } from "@/lib/permissions";
import type { CommitteeType } from "@/lib/types";
import { useUiAudio } from "@/components/UiAudioProvider";

function AdminSetupScreen() {
  const { conference, initConference, createCommittee } = useConference();
  const { playConfirm } = useUiAudio();
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
      playConfirm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <PanelStage className="!mx-0">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-[color:var(--purple-dark)]">
          Conference Setup
        </h2>
        <p className="mt-2 text-[color:var(--purple-primary)]">
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
          <Button onClick={handleCreate} disabled={saving || !committeeName.trim()}>
            {saving ? "Creating..." : "Create Committee & Start"}
          </Button>
        </div>
      </Card>
      </PanelStage>
    </div>
  );
}

function QuickCreateCommitteeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { createCommittee } = useConference();
  const { playConfirm } = useUiAudio();
  const [name, setName] = useState("");
  const [type, setType] = useState<CommitteeType>("ga");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createCommittee(name.trim(), type, topic.trim(), type === "ga");
      playConfirm();
      setName("");
      setTopic("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Committee">
      <div className="grid gap-3">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. UN Security Council"
        />
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as CommitteeType)}
          options={[
            { value: "ga", label: "GA" },
            { value: "crisis", label: "Crisis" },
            { value: "specialized", label: "Specialized" },
          ]}
        />
        <Input
          label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function HomeContent() {
  const { user, logout } = useAuth();
  const { conference, conferenceUnavailable } = useConference();
  const { view, activeTab } = useWorkspaceNavigation();
  const [showCreate, setShowCreate] = useState(false);

  const noCommittees = !conference || conference.committees.length === 0;

  if (noCommittees) {
    if (user && hasPermission(user, "conference:manage")) {
      return <AdminSetupScreen />;
    }
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-xl font-semibold text-[color:var(--purple-dark)]">
          {conferenceUnavailable
            ? "Conference no longer available"
            : "No committees yet"}
        </p>
        <p className="mt-2 text-[color:var(--purple-primary)]">
          {conferenceUnavailable
            ? "This conference has been removed. Sign out to return to the login page."
            : "Ask your conference admin to assign you to a committee."}
        </p>
        <div className="mt-6">
          <Button variant="secondary" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (view === "conference-home") {
    if (user && canAccessAllCommittees(user)) {
      return (
        <>
          <ConferenceHome onRequestCreate={() => setShowCreate(true)} />
          <QuickCreateCommitteeModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
          />
        </>
      );
    }
    return <CommitteeHome />;
  }

  if (view === "committee-home") {
    return <CommitteeHome />;
  }

  if (activeTab) {
    return <WorkspaceChamber activeTab={activeTab} />;
  }

  return <CommitteeHome />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
