"use client";

import { useMemo, useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { TimerCard } from "@/components/motions/TimerControls";
import { useCountdown } from "@/hooks/useCountdown";
import { VOTE_MODES } from "@/lib/constants";
import {
  aggregateDelegateVotes,
  draftResolutionPasses,
  simpleMajorityPasses,
} from "@/lib/voting";
import { ensureSessionState, normalizeVoteMode } from "@/lib/session-state";
import {
  getLatestRollCall,
  getRollCallVotingDelegates,
} from "@/lib/rollcall";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import type {
  DelegatePaperVote,
  DivisionPartStatus,
  MotionStatus,
  VoteMode,
} from "@/lib/types";

function voteTargetLabel(type: string): string {
  switch (type) {
    case "division":
      return "Motion for division";
    case "competence":
      return "Motion on competence";
    case "division_part":
      return "Divided part";
    case "division_whole":
      return "Proposal as a whole";
    case "document":
      return "Draft resolution";
    case "amendment":
      return "Amendment";
    default:
      return type;
  }
}

export function VotingPanel() {
  const {
    activeCommittee,
    patchVoteContext,
    clearVoteContext,
    updateDocument,
    updateAmendment,
    updateMotion,
    addSpeakingEvent,
    setFloorAllotment,
  } = useConference();

  const [eovDelegate, setEovDelegate] = useState("");
  const [eovWhen, setEovWhen] = useState<"before" | "after">("before");
  const [forDelegate, setForDelegate] = useState("");
  const [againstDelegate, setAgainstDelegate] = useState("");
  const [eovTime, setEovTime] = useState("60");
  const [proceduralSpeakSec, setProceduralSpeakSec] = useState("60");

  const session = useMemo(
    () =>
      activeCommittee
        ? ensureSessionState(activeCommittee.sessionState, activeCommittee.topic)
        : null,
    [activeCommittee]
  );

  const vote = session?.voteContext;
  const floor = session?.floorAllotment;
  const floorTimer = useCountdown(floor?.allottedSec ?? 0);

  if (!activeCommittee || !session) return null;

  const country = (id: string) =>
    activeCommittee.delegates.find((d) => d.id === id)?.country ?? id;

  if (!vote) {
    return (
      <Card title="Voting">
        <p className="text-sm text-purple-700">
          No active vote. Open a vote from the Proposals tab, or begin a
          division / competence motion from the Motions tab.
        </p>
      </Card>
    );
  }

  const voteMode = normalizeVoteMode(vote.mode);

  const isProceduralMotionVote =
    vote.target.type === "division" || vote.target.type === "competence";

  const targetDoc =
    vote.target.type === "document"
      ? activeCommittee.documents.find((d) => d.id === vote.target.id)
      : vote.target.parentDocumentId
        ? activeCommittee.documents.find(
            (d) => d.id === vote.target.parentDocumentId
          )
        : vote.competence?.documentId
          ? activeCommittee.documents.find(
              (d) => d.id === vote.competence?.documentId
            )
          : undefined;

  const targetAmendment =
    vote.target.type === "amendment" && targetDoc
      ? targetDoc.amendments.find((a) => a.id === vote.target.id)
      : undefined;

  const linkedMotionId =
    vote.target.type === "division" || vote.target.type === "competence"
      ? vote.target.id
      : vote.competence?.motionId;

  const linkedMotion = linkedMotionId
    ? activeCommittee.motions.find((m) => m.id === linkedMotionId)
    : undefined;

  const proposerIds = new Set([
    ...(targetDoc?.sponsors ?? []),
    ...(targetAmendment?.sponsors ?? []),
  ]);

  const rollCall = getLatestRollCall(activeCommittee);
  const votingDelegates = rollCall
    ? getRollCallVotingDelegates(activeCommittee, rollCall)
    : activeCommittee.delegates;

  const yes = vote.tallies?.yes ?? 0;
  const no = vote.tallies?.no ?? 0;
  const abstain = vote.tallies?.abstain ?? 0;

  /** Two speakers for and against the motion — before the motion vote. */
  const needsForAgainst = isProceduralMotionVote && !vote.resultApplied;

  /** EOVs apply to the proposal as a whole — not procedural motions or divided parts. */
  const showEov =
    !isProceduralMotionVote && vote.target.type !== "division_part";

  const syncMotionOutcome = (
    status: MotionStatus,
    votesFor: number,
    votesAgainst: number,
    votesAbstain: number
  ) => {
    if (!linkedMotion) return;
    updateMotion({
      ...linkedMotion,
      status,
      votesFor,
      votesAgainst,
      votesAbstain,
    });
  };

  const addEov = () => {
    if (!eovDelegate) return;
    if (proposerIds.has(eovDelegate)) return;
    if (eovWhen === "before") {
      patchVoteContext({
        eov: {
          ...vote.eov,
          beforeOpen: true,
          beforeSpeakers: [...vote.eov.beforeSpeakers, eovDelegate],
        },
      });
    } else {
      patchVoteContext({
        eov: {
          ...vote.eov,
          afterOpen: true,
          afterSpeakers: [...vote.eov.afterSpeakers, eovDelegate],
        },
      });
    }
    setEovDelegate("");
  };

  const startEov = (delegateId: string, when: "before" | "after") => {
    const sec = Number(eovTime) || 60;
    setFloorAllotment({
      kind: when === "before" ? "eov_before" : "eov_after",
      delegateId,
      allottedSec: sec,
      documentId: targetDoc?.id,
      startedAt: new Date().toISOString(),
    });
    floorTimer.reset(sec);
    floorTimer.start();
  };

  const finishEov = () => {
    if (!floor) return;
    addSpeakingEvent({
      delegateId: floor.delegateId,
      eventType: "eov",
      durationSeconds: Math.max(0, floor.allottedSec - floorTimer.seconds),
    });
    setFloorAllotment(undefined);
    floorTimer.pause();
  };

  const startProceduralSpeech = (delegateId: string) => {
    const sec = Number(proceduralSpeakSec) || 60;
    setFloorAllotment({
      kind: "other",
      delegateId,
      allottedSec: sec,
      documentId: targetDoc?.id,
      startedAt: new Date().toISOString(),
    });
    floorTimer.reset(sec);
    floorTimer.start();
  };

  const finishProceduralSpeech = () => {
    if (!floor) return;
    addSpeakingEvent({
      delegateId: floor.delegateId,
      eventType: "procedural_debate",
      durationSeconds: Math.max(0, floor.allottedSec - floorTimer.seconds),
    });
    setFloorAllotment(undefined);
    floorTimer.pause();
  };

  const setRecorded = (delegateId: string, value: DelegatePaperVote) => {
    const recordedVotes = { ...(vote.recordedVotes ?? {}), [delegateId]: value };
    const tallies = aggregateDelegateVotes(recordedVotes);
    patchVoteContext({
      recordedVotes,
      tallies: {
        yes: tallies.votesFor,
        no: tallies.votesAgainst,
        abstain: tallies.votesAbstain,
      },
    });
  };

  const applyProposalResult = (passed: boolean) => {
    if (vote.target.type === "document" && targetDoc) {
      updateDocument({
        ...targetDoc,
        status: passed ? "adopted" : "failed",
      });
    } else if (
      vote.target.type === "amendment" &&
      targetDoc &&
      targetAmendment
    ) {
      updateAmendment(targetDoc.id, {
        ...targetAmendment,
        status: passed ? "incorporated" : "failed",
      });
    } else if (vote.target.type === "division" && vote.division) {
      syncMotionOutcome(
        passed ? "passed" : "failed",
        yes,
        no,
        abstain
      );
      if (!passed) {
        patchVoteContext({ resultApplied: true });
        return;
      }
      const first = vote.division.parts[0];
      if (!first) {
        patchVoteContext({ resultApplied: true });
        return;
      }
      // Motion to divide passed — now vote each part (no EOVs on parts).
      patchVoteContext({
        target: {
          type: "division_part",
          id: first.id,
          parentDocumentId: vote.target.parentDocumentId,
          partLabel: first.label,
        },
        speakersFor: [],
        speakersAgainst: [],
        tallies: { yes: 0, no: 0, abstain: 0 },
        recordedVotes: {},
        votingStarted: false,
        resultApplied: false,
        eov: {
          beforeOpen: false,
          afterOpen: false,
          beforeSpeakers: [],
          afterSpeakers: [],
        },
      });
      return;
    } else if (vote.target.type === "competence" && vote.competence) {
      syncMotionOutcome(
        passed ? "passed" : "failed",
        yes,
        no,
        abstain
      );
      patchVoteContext({
        competence: {
          ...vote.competence,
          status: passed ? "competent" : "not_competent",
        },
        resultApplied: true,
      });
      return;
    } else if (vote.target.type === "division_part" && vote.division) {
      const parts = vote.division.parts.map((p) =>
        p.id === vote.target.id
          ? {
              ...p,
              status: (passed ? "approved" : "rejected") as DivisionPartStatus,
            }
          : p
      );
      const nextPending = parts.find((p) => p.status === "pending");
      if (nextPending) {
        patchVoteContext({
          division: { ...vote.division, parts },
          target: {
            type: "division_part",
            id: nextPending.id,
            parentDocumentId: vote.target.parentDocumentId,
            partLabel: nextPending.label,
          },
          tallies: { yes: 0, no: 0, abstain: 0 },
          recordedVotes: {},
          votingStarted: false,
          eov: {
            beforeOpen: false,
            afterOpen: false,
            beforeSpeakers: [],
            afterSpeakers: [],
          },
        });
        return;
      }
      const allRejected = parts.every((p) => p.status === "rejected");
      if (allRejected) {
        if (targetDoc) {
          updateDocument({ ...targetDoc, status: "failed" });
        }
        patchVoteContext({
          division: { parts, wholeStatus: "rejected" },
          resultApplied: true,
        });
        return;
      }
      patchVoteContext({
        division: { parts, wholeStatus: "pending" },
        target: {
          type: "division_whole",
          id: vote.target.parentDocumentId ?? targetDoc?.id ?? "",
          parentDocumentId: vote.target.parentDocumentId,
        },
        tallies: { yes: 0, no: 0, abstain: 0 },
        recordedVotes: {},
        votingStarted: false,
        eov: {
          beforeOpen: false,
          afterOpen: false,
          beforeSpeakers: [],
          afterSpeakers: [],
        },
      });
      return;
    } else if (vote.target.type === "division_whole" && vote.division) {
      if (targetDoc) {
        updateDocument({
          ...targetDoc,
          status: passed ? "adopted" : "failed",
        });
      }
      patchVoteContext({
        division: {
          ...vote.division,
          wholeStatus: passed ? "approved" : "rejected",
        },
        resultApplied: true,
      });
      return;
    }
    patchVoteContext({ resultApplied: true });
  };

  const applyConsensus = () => {
    applyProposalResult(true);
  };

  const applyTallies = () => {
    const isProcedural =
      vote.target.type === "competence" ||
      vote.target.type === "division" ||
      vote.target.type === "appeal";
    const passed = isProcedural
      ? simpleMajorityPasses(yes, no)
      : draftResolutionPasses(yes, no);
    applyProposalResult(passed);
  };

  return (
    <div className="space-y-4">
      <Card title="Active vote">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="purple">{voteTargetLabel(vote.target.type)}</Badge>
          <span className="font-medium text-purple-900">
            {vote.target.partLabel ||
              targetAmendment?.title ||
              targetDoc?.title ||
              linkedMotion?.type ||
              vote.target.id}
          </span>
          {vote.resultApplied && <Badge color="green">Result applied</Badge>}
        </div>

        {isProceduralMotionVote && !vote.resultApplied && (
          <p className="mt-2 text-sm text-purple-700">
            Speakers for and against the motion speak first, then the committee
            votes on the motion
            {vote.target.type === "competence"
              ? " before any vote on the proposal"
              : " — only if it passes are the divided parts put to a vote"}
            .
          </p>
        )}

        <div className="mt-3 max-w-xs">
          <Select
            label="Vote mode"
            value={voteMode}
            onChange={(e) =>
              patchVoteContext({ mode: e.target.value as VoteMode })
            }
            options={VOTE_MODES.map((m) => ({
              value: m.value,
              label: m.label,
            }))}
          />
        </div>

        {vote.competence && (
          <p className="mt-2 text-sm text-purple-700">
            Competence status: {vote.competence.status}
            {vote.competence.status === "not_competent" &&
              " — proposal vote blocked"}
          </p>
        )}

        {vote.division && (
          <div className="mt-3 space-y-1 text-sm">
            {vote.division.parts.map((p) => (
              <div key={p.id} className="flex gap-2">
                <Badge
                  color={
                    p.status === "approved"
                      ? "green"
                      : p.status === "rejected"
                        ? "red"
                        : "gray"
                  }
                >
                  {p.status}
                </Badge>
                <span className="text-purple-900">{p.label}</span>
              </div>
            ))}
            {vote.division.wholeStatus &&
              vote.division.wholeStatus !== "pending" && (
                <p className="text-purple-700">
                  Whole: {vote.division.wholeStatus}
                </p>
              )}
          </div>
        )}

        <div className="mt-4">
          <Button variant="secondary" onClick={clearVoteContext}>
            Close vote context
          </Button>
        </div>
      </Card>

      {needsForAgainst && (
        <Card title="Speakers for / against the motion (max 2 each)">
          <p className="mb-3 text-sm text-purple-700">
            Limited debate on the motion only — not on the substance of the
            proposal.
          </p>
          <div className="mb-3 max-w-xs">
            <Input
              label="Speaking time (sec)"
              value={proceduralSpeakSec}
              onChange={(e) => setProceduralSpeakSec(e.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-purple-800">For</p>
              <ul className="mb-2 space-y-1 text-sm">
                {(vote.speakersFor ?? []).map((id) => (
                  <li key={id} className="flex items-center gap-2">
                    {country(id)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startProceduralSpeech(id)}
                    >
                      Speak
                    </Button>
                  </li>
                ))}
              </ul>
              {(vote.speakersFor ?? []).length < 2 && (
                <div className="flex gap-2">
                  <Select
                    label=""
                    value={forDelegate}
                    onChange={(e) => setForDelegate(e.target.value)}
                    options={[
                      { value: "", label: "Select..." },
                      ...activeCommittee.delegates.map((d) => ({
                        value: d.id,
                        label: d.country,
                      })),
                    ]}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!forDelegate) return;
                      patchVoteContext({
                        speakersFor: [
                          ...(vote.speakersFor ?? []),
                          forDelegate,
                        ],
                      });
                      setForDelegate("");
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-purple-800">
                Against
              </p>
              <ul className="mb-2 space-y-1 text-sm">
                {(vote.speakersAgainst ?? []).map((id) => (
                  <li key={id} className="flex items-center gap-2">
                    {country(id)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startProceduralSpeech(id)}
                    >
                      Speak
                    </Button>
                  </li>
                ))}
              </ul>
              {(vote.speakersAgainst ?? []).length < 2 && (
                <div className="flex gap-2">
                  <Select
                    label=""
                    value={againstDelegate}
                    onChange={(e) => setAgainstDelegate(e.target.value)}
                    options={[
                      { value: "", label: "Select..." },
                      ...activeCommittee.delegates.map((d) => ({
                        value: d.id,
                        label: d.country,
                      })),
                    ]}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!againstDelegate) return;
                      patchVoteContext({
                        speakersAgainst: [
                          ...(vote.speakersAgainst ?? []),
                          againstDelegate,
                        ],
                      });
                      setAgainstDelegate("");
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          </div>
          {floor && floor.kind === "other" && (
            <div className="mt-4">
            <TimerCard
              label={`Procedural debate — ${country(floor.delegateId)}`}
              seconds={floorTimer.seconds}
              running={floorTimer.running}
              onStart={floorTimer.start}
              onPause={floorTimer.pause}
              onReset={() => floorTimer.reset(floor.allottedSec)}
              onClose={finishProceduralSpeech}
              startLabel="Resume"
            />
              <Button
                className="mt-2"
                size="sm"
                onClick={finishProceduralSpeech}
              >
                End speech
              </Button>
            </div>
          )}
        </Card>
      )}

      {showEov && (
        <Card title="Explanations of vote">
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="When"
              value={eovWhen}
              onChange={(e) =>
                setEovWhen(e.target.value as "before" | "after")
              }
              options={[
                { value: "before", label: "Before the vote" },
                { value: "after", label: "After the vote" },
              ]}
            />
            <Select
              label="Delegation"
              value={eovDelegate}
              onChange={(e) => setEovDelegate(e.target.value)}
              options={[
                { value: "", label: "Select..." },
                ...activeCommittee.delegates
                  .filter((d) => !proposerIds.has(d.id))
                  .map((d) => ({ value: d.id, label: d.country })),
              ]}
            />
            <Input
              label="EOV time (sec)"
              value={eovTime}
              onChange={(e) => setEovTime(e.target.value)}
            />
          </div>
          <div className="mt-3">
            <Button size="sm" onClick={addEov} disabled={!eovDelegate}>
              Add to EOV list
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium text-purple-800">Before</p>
              <ul className="space-y-1 text-sm">
                {vote.eov.beforeSpeakers.map((id) => (
                  <li key={id} className="flex items-center gap-2">
                    {country(id)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEov(id, "before")}
                    >
                      Speak
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-purple-800">After</p>
              <ul className="space-y-1 text-sm">
                {vote.eov.afterSpeakers.map((id) => (
                  <li key={id} className="flex items-center gap-2">
                    {country(id)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEov(id, "after")}
                    >
                      Speak
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {floor &&
            (floor.kind === "eov_before" || floor.kind === "eov_after") && (
              <div className="mt-4">
                <TimerCard
                  label={`EOV — ${country(floor.delegateId)}`}
                  seconds={floorTimer.seconds}
                  running={floorTimer.running}
                  onStart={floorTimer.start}
                  onPause={floorTimer.pause}
                  onReset={() => floorTimer.reset(floor.allottedSec)}
                  onClose={finishEov}
                  startLabel="Resume"
                />
                <Button className="mt-2" size="sm" onClick={finishEov}>
                  End EOV
                </Button>
              </div>
            )}
        </Card>
      )}

      {voteMode === "consensus" && !isProceduralMotionVote && (
        <Card title="Consensus">
          <Button onClick={applyConsensus} disabled={!!vote.resultApplied}>
            Adopt by consensus
          </Button>
        </Card>
      )}

      {(voteMode === "recorded" || isProceduralMotionVote) && (
        <Card
          title={
            isProceduralMotionVote ? "Vote on the motion" : "Recorded vote"
          }
        >
          <p className="mb-3 text-sm text-purple-700">
            {isProceduralMotionVote
              ? "After speakers for and against, put the motion to an immediate vote (simple majority)."
              : "Vote by placard-raising."}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Yes"
              type="number"
              value={yes}
              onChange={(e) =>
                patchVoteContext({
                  tallies: {
                    yes: Number(e.target.value) || 0,
                    no,
                    abstain,
                  },
                  votingStarted: true,
                })
              }
            />
            <Input
              label="No"
              type="number"
              value={no}
              onChange={(e) =>
                patchVoteContext({
                  tallies: {
                    yes,
                    no: Number(e.target.value) || 0,
                    abstain,
                  },
                  votingStarted: true,
                })
              }
            />
            <Input
              label="Abstain"
              type="number"
              value={abstain}
              onChange={(e) =>
                patchVoteContext({
                  tallies: {
                    yes,
                    no,
                    abstain: Number(e.target.value) || 0,
                  },
                  votingStarted: true,
                })
              }
            />
          </div>

          <p className="mb-2 mt-6 text-sm font-medium text-purple-800">
            By delegation
          </p>
          <div className="space-y-2">
            {votingDelegates.map((d) => {
              const v = vote.recordedVotes?.[d.id];
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border border-purple-50 p-2"
                >
                  <span className="font-medium text-purple-900">
                    {d.country}
                  </span>
                  <div className="flex gap-1">
                    {(["yes", "no", "abstain"] as const).map((opt) => (
                      <Button
                        key={opt}
                        size="sm"
                        variant={v === opt ? "primary" : "secondary"}
                        onClick={() => {
                          patchVoteContext({ votingStarted: true });
                          setRecorded(d.id, opt);
                        }}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-purple-700">
            Yes {yes} · No {no} · Abstain {abstain}
          </p>
          <Button
            className="mt-2"
            onClick={applyTallies}
            disabled={!!vote.resultApplied}
          >
            Apply result
          </Button>
        </Card>
      )}
    </div>
  );
}
