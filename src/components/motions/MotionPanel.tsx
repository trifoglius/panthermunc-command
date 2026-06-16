"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { MOTION_TYPES, VOTE_MANNERS } from "@/lib/constants";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import type { Motion, MotionStatus } from "@/lib/types";

export function MotionPanel() {
  const { activeCommittee, addMotion, updateMotion } = useConference();
  const [motionType, setMotionType] = useState<string>(MOTION_TYPES[0].id);
  const [proposedBy, setProposedBy] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  if (!activeCommittee) return null;

  const selectedMotion = MOTION_TYPES.find((m) => m.id === motionType)!;

  const handleSubmit = () => {
    if (!proposedBy) return;
    addMotion({
      type: selectedMotion.label,
      proposedBy,
      status: "pending",
      disruptivity: selectedMotion.disruptivity,
      details,
      notes,
    });
    setDetails({});
    setNotes("");
  };

  const sortedMotions = [...activeCommittee.motions].sort(
    (a, b) => b.disruptivity - a.disruptivity
  );

  return (
    <div className="space-y-4">
      <Card title="Propose Motion">
        <p className="mb-3 text-sm text-purple-700">
          Motions are voted on from most to least disruptive (Rule 3).
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Motion Type"
            value={motionType}
            onChange={(e) => {
              setMotionType(e.target.value);
              setDetails({});
            }}
            options={MOTION_TYPES.map((m) => ({
              value: m.id,
              label: `Rule ${m.rule}: ${m.label}`,
            }))}
          />
          <Select
            label="Proposed By"
            value={proposedBy}
            onChange={(e) => setProposedBy(e.target.value)}
            options={[
              { value: "", label: "Select country..." },
              ...activeCommittee.delegates.map((d) => ({
                value: d.id,
                label: d.country,
              })),
            ]}
          />
        </div>

        {selectedMotion.fields.length > 0 && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {selectedMotion.fields.map((field) =>
              field.type === "textarea" ? (
                <Textarea
                  key={field.key}
                  label={field.label}
                  value={details[field.key] ?? ""}
                  onChange={(e) =>
                    setDetails({ ...details, [field.key]: e.target.value })
                  }
                  rows={3}
                />
              ) : field.type === "select" && field.key === "vote_manner" ? (
                <Select
                  key={field.key}
                  label={field.label}
                  value={details[field.key] ?? ""}
                  onChange={(e) =>
                    setDetails({ ...details, [field.key]: e.target.value })
                  }
                  options={[
                    { value: "", label: "Select..." },
                    ...VOTE_MANNERS.map((v) => ({ value: v, label: v })),
                  ]}
                />
              ) : field.type === "select" ? (
                <Select
                  key={field.key}
                  label={field.label}
                  value={details[field.key] ?? ""}
                  onChange={(e) =>
                    setDetails({ ...details, [field.key]: e.target.value })
                  }
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                />
              ) : (
                <Input
                  key={field.key}
                  label={field.label}
                  value={details[field.key] ?? ""}
                  onChange={(e) =>
                    setDetails({ ...details, [field.key]: e.target.value })
                  }
                />
              )
            )}
          </div>
        )}

        <div className="mt-3">
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="mt-3">
          <Button onClick={handleSubmit} disabled={!proposedBy}>
            Log Motion
          </Button>
        </div>
      </Card>

      <Card title="Motion Queue (by Disruptivity)">
        {sortedMotions.length === 0 ? (
          <p className="text-sm text-purple-600">No motions logged yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedMotions.map((motion) => (
              <MotionRow
                key={motion.id}
                motion={motion}
                committee={activeCommittee}
                onUpdate={updateMotion}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MotionRow({
  motion,
  committee,
  onUpdate,
}: {
  motion: Motion;
  committee: NonNullable<ReturnType<typeof useConference>["activeCommittee"]>;
  onUpdate: (m: Motion) => void;
}) {
  const proposer = committee.delegates.find((d) => d.id === motion.proposedBy);
  const statusColors: Record<MotionStatus, "yellow" | "green" | "red" | "gray"> =
    {
      pending: "yellow",
      passed: "green",
      failed: "red",
      withdrawn: "gray",
    };

  return (
    <div className="rounded-md border border-purple-100 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-purple-900">{motion.type}</p>
          <p className="text-sm text-purple-600">
            {proposer?.country ?? "Unknown"} ·{" "}
            {new Date(motion.timestamp).toLocaleString()} · Disruptivity:{" "}
            {motion.disruptivity}
          </p>
          {Object.entries(motion.details).map(([k, v]) =>
            v ? (
              <p key={k} className="text-sm text-purple-700">
                {k.replace(/_/g, " ")}: {v}
              </p>
            ) : null
          )}
          {motion.notes && (
            <p className="text-sm italic text-purple-600">{motion.notes}</p>
          )}
        </div>
        <Badge color={statusColors[motion.status]}>{motion.status}</Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {(["pending", "passed", "failed", "withdrawn"] as MotionStatus[]).map(
          (s) => (
            <Button
              key={s}
              size="sm"
              variant={motion.status === s ? "primary" : "secondary"}
              onClick={() => onUpdate({ ...motion, status: s })}
            >
              {s}
            </Button>
          )
        )}
        <Input
          type="number"
          placeholder="For"
          className="max-w-20"
          value={motion.votesFor ?? ""}
          onChange={(e) =>
            onUpdate({
              ...motion,
              votesFor: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
        <Input
          type="number"
          placeholder="Against"
          className="max-w-20"
          value={motion.votesAgainst ?? ""}
          onChange={(e) =>
            onUpdate({
              ...motion,
              votesAgainst: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
        <Input
          type="number"
          placeholder="Abstain"
          className="max-w-20"
          value={motion.votesAbstain ?? ""}
          onChange={(e) =>
            onUpdate({
              ...motion,
              votesAbstain: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
