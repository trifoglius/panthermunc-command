"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { MotionActiveSession } from "@/components/motions/MotionActiveSession";
import { DocumentOrderField } from "@/components/motions/DocumentOrderField";
import { PointsPanel } from "@/components/points/PointsPanel";
import { MOTION_TYPES, VOTE_MANNERS } from "@/lib/constants";
import { computeMotionDisruptivity } from "@/lib/motion-disruptivity";
import { motionHasActiveSession } from "@/lib/motion-timers";
import { parseDocumentOrder } from "@/lib/voting";
import { isActiveDraftResolution, getSubmissionOrderIds } from "@/lib/documents";
import type { MotionField } from "@/lib/constants";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import type { Motion, MotionStatus } from "@/lib/types";

export function MotionPanel() {
  const {
    activeCommittee,
    addMotion,
    updateMotion,
    archiveMotionQueue,
  } = useConference();
  const [motionType, setMotionType] = useState<string>(MOTION_TYPES[0].id);
  const [proposedBy, setProposedBy] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [activeMotionId, setActiveMotionId] = useState<string | null>(null);

  if (!activeCommittee) return null;

  const selectedMotion = MOTION_TYPES.find((m) => m.id === motionType)!;
  const activeMotion = activeCommittee.motions.find(
    (m) => m.id === activeMotionId
  );

  const draftResolutions = activeCommittee.documents.filter(isActiveDraftResolution);
  const submissionOrderIds = getSubmissionOrderIds(activeCommittee);

  const visibleFields = selectedMotion.fields.filter((field) => {
    if (!field.showWhen) return true;
    return details[field.showWhen.field] === field.showWhen.value;
  });

  const renderMotionField = (field: MotionField) => {
    if (field.type === "textarea") {
      return (
        <Textarea
          key={field.key}
          label={field.label}
          value={details[field.key] ?? ""}
          onChange={(e) =>
            setDetails({ ...details, [field.key]: e.target.value })
          }
          rows={3}
        />
      );
    }

    if (field.type === "document_order") {
      return (
        <div key={field.key} className="md:col-span-2">
          <DocumentOrderField
            label={field.label}
            value={details[field.key] ?? ""}
            onChange={(value) =>
              setDetails({ ...details, [field.key]: value })
            }
            documents={draftResolutions}
            submissionOrderIds={submissionOrderIds}
          />
        </div>
      );
    }

    if (field.type === "document_select") {
      return (
        <Select
          key={field.key}
          label={field.label}
          value={details[field.key] ?? ""}
          onChange={(e) =>
            setDetails({ ...details, [field.key]: e.target.value })
          }
          options={[
            { value: "", label: "Select draft resolution..." },
            ...draftResolutions.map((doc) => ({
              value: doc.id,
              label: doc.title,
            })),
          ]}
        />
      );
    }

    if (field.type === "select") {
      const options =
        field.key === "vote_manner"
          ? [
              { value: "", label: "Select..." },
              ...VOTE_MANNERS.map((v) => ({ value: v, label: v })),
            ]
          : [
              { value: "", label: "Select..." },
              ...(field.options ?? []),
            ];

      return (
        <Select
          key={field.key}
          label={field.label}
          value={details[field.key] ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            const next = { ...details, [field.key]: value };
            if (field.key === "two_for_two_against" && value !== "yes") {
              delete next.speaking_time;
              delete next.speaker_order;
            }
            setDetails(next);
          }}
          options={options}
        />
      );
    }

    return (
      <Input
        key={field.key}
        label={field.label}
        value={details[field.key] ?? ""}
        onChange={(e) =>
          setDetails({ ...details, [field.key]: e.target.value })
        }
      />
    );
  };

  const handleSubmit = () => {
    if (!proposedBy) return;
    addMotion({
      motionTypeId: selectedMotion.id,
      type: selectedMotion.label,
      proposedBy,
      status: "pending",
      disruptivity: computeMotionDisruptivity(
        selectedMotion.id,
        selectedMotion.disruptivity,
        details
      ),
      details,
      notes,
    });
    setDetails({});
    setNotes("");
  };

  const handleStatusChange = (motion: Motion, status: MotionStatus) => {
    const updated = { ...motion, status };
    updateMotion(updated);
    if (status === "passed" && motionHasActiveSession(updated)) {
      setActiveMotionId(motion.id);
    }
  };

  const sortedMotions = [...activeCommittee.motions].sort(
    (a, b) => b.disruptivity - a.disruptivity
  );

  const passedMotions = sortedMotions.filter((m) => m.status === "passed");
  const archiveTarget =
    (activeMotionId && passedMotions.find((m) => m.id === activeMotionId)) ??
    passedMotions[0];

  const handleArchive = () => {
    if (!archiveTarget) return;
    archiveMotionQueue(archiveTarget.id);
    setActiveMotionId(null);
  };

  return (
    <div className="space-y-4">
      {activeMotion && activeMotion.status === "passed" && (
        <MotionActiveSession
          motion={activeMotion}
          onDismiss={() => setActiveMotionId(null)}
        />
      )}

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

        {visibleFields.length > 0 && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {visibleFields.map((field) => renderMotionField(field))}
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

      <Card title="Motion Queue">
        {passedMotions.length > 0 && sortedMotions.length > 0 && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-900">
              A motion has passed
              {archiveTarget ? `: ${archiveTarget.type}` : ""}. When finished,
              archive this queue to save it to Motion Queues and start fresh.
            </p>
            <Button className="mt-2" onClick={handleArchive}>
              Archive Queue &amp; Clear
            </Button>
          </div>
        )}

        {sortedMotions.length === 0 ? (
          <p className="text-sm text-purple-600">No motions logged yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedMotions.map((motion) => (
              <MotionRow
                key={motion.id}
                motion={motion}
                committee={activeCommittee}
                isActive={activeMotionId === motion.id}
                onStatusChange={handleStatusChange}
                onUpdate={updateMotion}
                onOpenSession={() => setActiveMotionId(motion.id)}
              />
            ))}
          </div>
        )}
      </Card>

      <PointsPanel />
    </div>
  );
}

function MotionRow({
  motion,
  committee,
  isActive,
  onStatusChange,
  onUpdate,
  onOpenSession,
}: {
  motion: Motion;
  committee: NonNullable<ReturnType<typeof useConference>["activeCommittee"]>;
  isActive: boolean;
  onStatusChange: (motion: Motion, status: MotionStatus) => void;
  onUpdate: (m: Motion) => void;
  onOpenSession: () => void;
}) {
  const proposer = committee.delegates.find((d) => d.id === motion.proposedBy);
  const hasActiveSession = motionHasActiveSession(motion);
  const statusColors: Record<MotionStatus, "yellow" | "green" | "red" | "gray"> =
    {
      pending: "yellow",
      passed: "green",
      failed: "red",
      withdrawn: "gray",
    };

  return (
    <div
      className={`rounded-md border p-3 ${
        isActive ? "border-purple-400 bg-purple-50" : "border-purple-100"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-purple-900">{motion.type}</p>
          <p className="text-sm text-purple-600">
            {proposer?.country ?? "Unknown"} ·{" "}
            {new Date(motion.timestamp).toLocaleString()} · Disruptivity:{" "}
            {motion.disruptivity}
          </p>
          {Object.entries(motion.details).map(([k, v]) => {
            if (!v) return null;
            let display = v;
            if (k === "resolution") {
              const doc = committee.documents.find((d) => d.id === v);
              display = doc?.title ?? v;
            } else if (k === "presentation_order" || k === "paper_order") {
              display = parseDocumentOrder(v)
                .map((id, i) => {
                  const doc = committee.documents.find((d) => d.id === id);
                  return `${i + 1}. ${doc?.title ?? id}`;
                })
                .join("; ");
            } else if (k === "speak_order") {
              display =
                v === "first"
                  ? "Speak first"
                  : v === "last"
                    ? "Speak last"
                    : v;
            } else if (k === "speaker_order") {
              display =
                v === "against_first"
                  ? "Against first, then alternate"
                  : v === "for_first"
                    ? "For first, then alternate"
                    : v;
            } else if (k === "amendment_type") {
              display = v === "friendly" ? "Friendly" : v === "unfriendly" ? "Unfriendly" : v;
            } else if (k === "two_for_two_against") {
              display = v === "yes" ? "Yes" : v === "no" ? "No" : v;
            }
            return (
              <p key={k} className="text-sm text-purple-700">
                {k.replace(/_/g, " ")}: {display}
              </p>
            );
          })}
          {motion.notes && (
            <p className="text-sm italic text-purple-600">{motion.notes}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge color={statusColors[motion.status]}>{motion.status}</Badge>
          {hasActiveSession && motion.status === "passed" && (
            <Button size="sm" variant="secondary" onClick={onOpenSession}>
              Open Session
            </Button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {(["pending", "passed", "failed", "withdrawn"] as MotionStatus[]).map(
          (s) => (
            <Button
              key={s}
              size="sm"
              variant={motion.status === s ? "primary" : "secondary"}
              onClick={() => onStatusChange(motion, s)}
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
