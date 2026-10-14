"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { PointsPanel } from "@/components/points/PointsPanel";
import { TimerDisplay } from "@/components/motions/TimerControls";
import { MOTION_TYPES } from "@/lib/constants";
import { isActiveDraftResolution } from "@/lib/documents";
import {
  addSpeakerWithReserve,
  getMotionTypeId,
  getTimerConfig,
} from "@/lib/motion-timers";
import { proceduralMotionPasses } from "@/lib/session-state";
import { useSessionTimers } from "@/hooks/useSessionTimers";
import type { MotionField } from "@/lib/constants";
import { Badge, Button, Card, Input, Select, Tabs, Textarea } from "@/components/ui";
import type { Motion, MotionStatus } from "@/lib/types";

/** Auto-derive pass/fail from yes/no when any votes are cast; null leaves status unchanged. */
function statusFromVotes(
  votesFor: number,
  votesAgainst: number
): MotionStatus | null {
  if (votesFor + votesAgainst === 0) return null;
  return proceduralMotionPasses(votesFor, votesAgainst) ? "passed" : "failed";
}

function motionHasOpenableTimer(motion: Motion): boolean {
  const config = getTimerConfig(motion);
  if (!config) return false;
  return (
    (config.totalSeconds ?? 0) > 0 ||
    (config.speakingSeconds ?? 0) > 0 ||
    (config.phases?.some((p) => p.seconds > 0) ?? false)
  );
}

export function MotionPanel() {
  const {
    activeCommittee,
    addMotion,
    updateMotion,
    beginProceduralMotionVote,
    archiveMotionQueue,
  } = useConference();
  const [motionType, setMotionType] = useState<string>(MOTION_TYPES[0].id);
  const [proposedBy, setProposedBy] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [motionSection, setMotionSection] = useState<"motions" | "points">(
    "motions"
  );

  if (!activeCommittee) return null;

  const selectedMotion = MOTION_TYPES.find((m) => m.id === motionType)!;
  const draftResolutions = activeCommittee.documents.filter(
    isActiveDraftResolution
  );

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
      return (
        <Select
          key={field.key}
          label={field.label}
          value={details[field.key] ?? field.options?.[0]?.value ?? ""}
          onChange={(e) =>
            setDetails({ ...details, [field.key]: e.target.value })
          }
          options={field.options ?? []}
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

  const submit = () => {
    if (!proposedBy) return;
    const detailsWithDefaults = { ...details };
    for (const field of selectedMotion.fields) {
      if (detailsWithDefaults[field.key] !== undefined) continue;
      if (field.type === "select" && field.options?.[0]?.value) {
        detailsWithDefaults[field.key] = field.options[0].value;
      }
    }
    if (selectedMotion.id === "change_speaking_time") {
      const seconds = Number(detailsWithDefaults.speaking_time);
      if (!Number.isFinite(seconds) || seconds <= 0) return;
    }
    addMotion({
      motionTypeId: selectedMotion.id,
      type: selectedMotion.label,
      proposedBy,
      status: "pending",
      disruptivity: 0,
      details: detailsWithDefaults,
      notes: notes.trim() || undefined,
    });
    setDetails({});
    setNotes("");
  };

  const country = (id: string) =>
    activeCommittee.delegates.find((d) => d.id === id)?.country ?? id;

  const chronological = [...activeCommittee.motions].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { id: "motions", label: "Motions" },
          { id: "points", label: "Points of order" },
        ]}
        activeId={motionSection}
        onChange={(id) => setMotionSection(id as "motions" | "points")}
        ariaLabel="Motions and points"
      />

      {motionSection === "points" ? (
        <PointsPanel />
      ) : (
        <>
          <Card title="Log motion">
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                label="Motion"
                value={motionType}
                onChange={(e) => {
                  setMotionType(e.target.value);
                  setDetails({});
                }}
                options={MOTION_TYPES.map((m) => ({
                  value: m.id,
                  label: m.label,
                }))}
              />
              <Select
                label="Proposed by"
                value={proposedBy}
                onChange={(e) => setProposedBy(e.target.value)}
                options={[
                  { value: "", label: "Select..." },
                  ...activeCommittee.delegates.map((d) => ({
                    value: d.id,
                    label: d.country,
                  })),
                ]}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {visibleFields.map(renderMotionField)}
            </div>
            <div className="mt-3">
              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="mt-3">
              <Button
                onClick={submit}
                disabled={
                  !proposedBy ||
                  (selectedMotion.id === "change_speaking_time" &&
                    !(Number(details.speaking_time) > 0))
                }
              >
                Log motion
              </Button>
            </div>
          </Card>

          <Card title="Motion log">
            {chronological.length === 0 ? (
              <p className="text-sm text-purple-600">No motions logged.</p>
            ) : (
              <ul className="space-y-3">
                {chronological.map((motion) => (
                  <MotionRow
                    key={motion.id}
                    motion={motion}
                    proposer={country(motion.proposedBy)}
                    onUpdate={updateMotion}
                    onBeginProceduralVote={() =>
                      beginProceduralMotionVote(motion)
                    }
                    onArchive={() => archiveMotionQueue(motion.id)}
                  />
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function MotionRow({
  motion,
  proposer,
  onUpdate,
  onBeginProceduralVote,
  onArchive,
}: {
  motion: Motion;
  proposer: string;
  onUpdate: (m: Motion) => void;
  onBeginProceduralVote: () => void;
  onArchive: () => void;
}) {
  const {
    activeCommittee,
    startModeratedCaucus,
  } = useConference();
  const [timerOpen, setTimerOpen] = useState(false);

  const typeId = getMotionTypeId(motion);
  const isModerated = typeId === "moderated_caucus";
  const isChangeSpeakingTime = typeId === "change_speaking_time";
  const isProceduralDebateMotion =
    typeId === "division_question" || typeId === "competence";
  const activeCaucus = activeCommittee?.sessionState?.activeCaucus;
  const speakingTime = activeCommittee?.sessionState?.speakingTime;
  const voteCtx = activeCommittee?.sessionState?.voteContext;
  const proceduralVoteOpen =
    isProceduralDebateMotion &&
    (voteCtx?.target.type === "division" ||
      voteCtx?.target.type === "competence") &&
    voteCtx.target.id === motion.id;
  const caucusActive =
    isModerated &&
    motion.status === "passed" &&
    activeCaucus?.motionId === motion.id;
  const canOpenTimer =
    motion.status === "passed" &&
    !isModerated &&
    !isProceduralDebateMotion &&
    motionHasOpenableTimer(motion);

  const statusColor =
    motion.status === "passed"
      ? "green"
      : motion.status === "failed"
        ? "red"
        : "gray";

  return (
    <li className="rounded-lg border border-purple-100 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-purple-900">{motion.type}</p>
          <p className="text-sm text-purple-600">
            {proposer} · {new Date(motion.timestamp).toLocaleString()}
          </p>
        </div>
        <Badge color={statusColor}>{motion.status}</Badge>
      </div>
      {Object.keys(motion.details).length > 0 && (
        <dl className="mt-2 grid gap-1 text-sm text-purple-700 sm:grid-cols-2">
          {Object.entries(motion.details).map(([k, v]) =>
            v ? (
              <div key={k}>
                <span className="text-purple-500">{k}: </span>
                {v}
              </div>
            ) : null
          )}
        </dl>
      )}
      {isChangeSpeakingTime &&
        motion.status === "passed" &&
        speakingTime && (
          <p className="mt-2 text-sm text-green-800">
            Speaking time now: {speakingTime.speakingSec}s
          </p>
        )}
      {isProceduralDebateMotion ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-purple-700">
            Two speakers for and against the motion, then vote on the motion
            {typeId === "competence"
              ? " before any vote on the proposal"
              : " before voting divided parts"}
            . Use the Voting tab — do not enter tallies here first.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Status"
              value={motion.status}
              onChange={(e) =>
                onUpdate({
                  ...motion,
                  status: e.target.value as MotionStatus,
                })
              }
              options={[
                { value: "pending", label: "Pending" },
                { value: "passed", label: "Passed" },
                { value: "failed", label: "Failed" },
                { value: "withdrawn", label: "Withdrawn" },
              ]}
              className="max-w-[10rem]"
            />
            {motion.status === "pending" && !proceduralVoteOpen && (
              <Button size="sm" onClick={onBeginProceduralVote}>
                Open procedural vote
              </Button>
            )}
            {proceduralVoteOpen && (
              <Badge color="purple">Open in Voting tab</Badge>
            )}
            {(motion.status === "passed" || motion.status === "failed") && (
              <Button size="sm" variant="secondary" onClick={onArchive}>
                Archive log after this motion
              </Button>
            )}
          </div>
          {(motion.votesFor != null ||
            motion.votesAgainst != null ||
            motion.votesAbstain != null) && (
            <p className="text-sm text-purple-600">
              Tallies from Voting: Yes {motion.votesFor ?? 0} · No{" "}
              {motion.votesAgainst ?? 0} · Abstain {motion.votesAbstain ?? 0}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <Input
              label="Yes"
              type="number"
              value={motion.votesFor ?? ""}
              onChange={(e) => {
                const votesFor = Number(e.target.value) || 0;
                const votesAgainst = motion.votesAgainst ?? 0;
                const autoStatus = statusFromVotes(votesFor, votesAgainst);
                onUpdate({
                  ...motion,
                  votesFor,
                  ...(autoStatus ? { status: autoStatus } : {}),
                });
              }}
            />
            <Input
              label="No"
              type="number"
              value={motion.votesAgainst ?? ""}
              onChange={(e) => {
                const votesAgainst = Number(e.target.value) || 0;
                const votesFor = motion.votesFor ?? 0;
                const autoStatus = statusFromVotes(votesFor, votesAgainst);
                onUpdate({
                  ...motion,
                  votesAgainst,
                  ...(autoStatus ? { status: autoStatus } : {}),
                });
              }}
            />
            <Input
              label="Abstain"
              type="number"
              value={motion.votesAbstain ?? ""}
              onChange={(e) =>
                onUpdate({
                  ...motion,
                  votesAbstain: Number(e.target.value) || 0,
                })
              }
            />
            <Select
              label="Status"
              value={motion.status}
              onChange={(e) =>
                onUpdate({
                  ...motion,
                  status: e.target.value as MotionStatus,
                })
              }
              options={[
                { value: "pending", label: "Pending" },
                { value: "passed", label: "Passed" },
                { value: "failed", label: "Failed" },
                { value: "withdrawn", label: "Withdrawn" },
              ]}
            />
          </div>
          {motion.status === "passed" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {isModerated && !caucusActive && (
                <Button size="sm" onClick={() => startModeratedCaucus(motion)}>
                  Open moderated caucus
                </Button>
              )}
              {canOpenTimer && (
                <Button
                  size="sm"
                  onClick={() => setTimerOpen((open) => !open)}
                >
                  {timerOpen ? "Close timer" : "Open timer"}
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={onArchive}>
                Archive log after this motion
              </Button>
            </div>
          )}
        </>
      )}
      {caucusActive && activeCaucus && (
        <div className="mt-3">
          <ModeratedCaucusSession motion={motion} />
        </div>
      )}
      {timerOpen && canOpenTimer && (
        <div className="mt-3">
          <PassedMotionTimer motion={motion} />
        </div>
      )}
    </li>
  );
}

function ModeratedCaucusSession({ motion }: { motion: Motion }) {
  const {
    activeCommittee,
    setCaucusSpeakerQueue,
    advanceCaucusSpeaker,
    setCaucusSpeakOrder,
    clearActiveCaucus,
    addSpeakingEvent,
  } = useConference();
  const [addId, setAddId] = useState("");
  const [sessionOpen, setSessionOpen] = useState(true);

  const caucus = activeCommittee?.sessionState?.activeCaucus;
  const config = getTimerConfig(motion);
  const timers = useSessionTimers(
    config?.totalSeconds ?? caucus?.totalSec ?? 0,
    config?.speakingSeconds ?? caucus?.speakingSec ?? 0
  );

  if (!activeCommittee || !caucus) return null;

  const country = (id: string) =>
    activeCommittee.delegates.find((d) => d.id === id)?.country ?? id;

  const addSpeaker = () => {
    if (!addId) return;
    const next = addSpeakerWithReserve(
      caucus.speakerQueue,
      addId,
      caucus.proposedBy,
      caucus.speakOrder,
      0
    );
    setCaucusSpeakerQueue(next);
    setAddId("");
  };

  const removeSpeaker = (index: number) => {
    setCaucusSpeakerQueue(caucus.speakerQueue.filter((_, i) => i !== index));
  };

  const moveSpeaker = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= caucus.speakerQueue.length) return;
    const swapped = [...caucus.speakerQueue];
    [swapped[index], swapped[j]] = [swapped[j], swapped[index]];
    setCaucusSpeakerQueue(swapped);
  };

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-purple-900">
          Moderated caucus
          {caucus.topic ? ` — ${caucus.topic}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSessionOpen((o) => !o)}
          >
            {sessionOpen ? "Hide session" : "Show session"}
          </Button>
          <Button size="sm" variant="ghost" onClick={clearActiveCaucus}>
            End caucus
          </Button>
        </div>
      </div>

      {sessionOpen && (
        <div className="space-y-3">
          <Select
            label="Proposer speaks"
            value={caucus.speakOrder ?? "none"}
            onChange={(e) => {
              const value = e.target.value;
              setCaucusSpeakOrder(
                value === "first" || value === "last" ? value : undefined
              );
            }}
            options={[
              { value: "none", label: "No reserve" },
              { value: "first", label: "First" },
              { value: "last", label: "Last" },
            ]}
            className="max-w-xs"
          />

          <div className="flex flex-wrap items-end gap-2">
            <Select
              label="Add speaker"
              value={addId}
              onChange={(e) => setAddId(e.target.value)}
              options={[
                { value: "", label: "Select..." },
                ...activeCommittee.delegates
                  .filter((d) => !caucus.speakerQueue.includes(d.id))
                  .map((d) => ({ value: d.id, label: d.country })),
              ]}
              className="min-w-[12rem] flex-1"
            />
            <Button onClick={addSpeaker} disabled={!addId}>
              Add
            </Button>
          </div>

          {caucus.speakerQueue.length === 0 ? (
            <p className="text-sm text-purple-600">
              No speakers yet. Add delegates to the caucus list.
            </p>
          ) : (
            <ol className="space-y-2">
              {caucus.speakerQueue.map((id, index) => (
                <li
                  key={`${id}-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded border border-purple-100 bg-white px-3 py-2 text-sm"
                >
                  <span className="w-6 text-purple-500">{index + 1}.</span>
                  <span className="font-medium text-purple-900">
                    {country(id)}
                  </span>
                  {id === caucus.proposedBy && caucus.speakOrder ? (
                    <Badge color="purple">Reserved {caucus.speakOrder}</Badge>
                  ) : null}
                  <div className="ml-auto flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveSpeaker(index, -1)}
                      disabled={index === 0}
                    >
                      Up
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => moveSpeaker(index, 1)}
                      disabled={index === caucus.speakerQueue.length - 1}
                    >
                      Down
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeSpeaker(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {caucus.speakerQueue[0] && (
            <Button
              size="sm"
              onClick={() => {
                const speaker = caucus.speakerQueue[0];
                addSpeakingEvent({
                  delegateId: speaker,
                  eventType: "moderated_caucus",
                  durationSeconds: caucus.speakingSec,
                });
                advanceCaucusSpeaker();
                timers.resetSpeaking(caucus.speakingSec);
              }}
            >
              Log speech &amp; advance ({country(caucus.speakerQueue[0])})
            </Button>
          )}

          {config && (
            <TimerDisplay config={config} motion={motion} timers={timers} />
          )}
        </div>
      )}
    </div>
  );
}

function PassedMotionTimer({ motion }: { motion: Motion }) {
  const config = getTimerConfig(motion);
  const timers = useSessionTimers(
    config?.totalSeconds ?? 0,
    config?.speakingSeconds ?? 0
  );

  if (!config) return null;

  return <TimerDisplay config={config} motion={motion} timers={timers} />;
}
