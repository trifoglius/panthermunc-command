"use client";

import { useMemo, useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { Badge, Button } from "@/components/ui";
import {
  canDelegateAbstainOnRollCall,
  getLatestRollCall,
  getRollCallVotingDelegates,
} from "@/lib/rollcall";
import { parseDocumentOrder } from "@/lib/voting";
import type { DelegatePaperVote, Motion } from "@/lib/types";

const VOTE_LABELS: Record<DelegatePaperVote, string> = {
  yes: "Yes",
  no: "No",
  abstain: "Abstain",
};

function findResumePosition(
  paperIds: string[],
  delegates: { id: string }[],
  rollCallVotes: Record<string, Record<string, DelegatePaperVote>>
): { paperIndex: number; delegateIndex: number } {
  for (let p = 0; p < paperIds.length; p++) {
    const docVotes = rollCallVotes[paperIds[p]] ?? {};
    for (let d = 0; d < delegates.length; d++) {
      if (!docVotes[delegates[d].id]) {
        return { paperIndex: p, delegateIndex: d };
      }
    }
  }
  return {
    paperIndex: Math.max(0, paperIds.length - 1),
    delegateIndex: Math.max(0, delegates.length - 1),
  };
}

export function RollCallVotingPanel({ motion }: { motion: Motion }) {
  const { activeCommittee, setMotionRollCallVote } = useConference();

  const paperIds = useMemo(
    () => parseDocumentOrder(motion.details.paper_order),
    [motion.details.paper_order]
  );

  const rollCall = activeCommittee ? getLatestRollCall(activeCommittee) : null;
  const delegates = useMemo(
    () =>
      activeCommittee && rollCall
        ? getRollCallVotingDelegates(activeCommittee, rollCall)
        : [],
    [activeCommittee, rollCall]
  );

  const savedRollCallVotes =
    activeCommittee?.motionSessionState?.[motion.id]?.rollCallVotes ?? {};

  const resume = useMemo(
    () => findResumePosition(paperIds, delegates, savedRollCallVotes),
    [paperIds, delegates, savedRollCallVotes]
  );

  const [paperIndex, setPaperIndex] = useState(resume.paperIndex);
  const [delegateIndex, setDelegateIndex] = useState(resume.delegateIndex);

  if (!activeCommittee) return null;

  if (!rollCall) {
    return (
      <div className="mt-4 border-t border-purple-100 pt-4">
        <p className="text-sm text-purple-600">
          No roll call on record. Conduct a roll call before recording votes.
        </p>
      </div>
    );
  }

  if (paperIds.length === 0) {
    return (
      <div className="mt-4 border-t border-purple-100 pt-4">
        <p className="text-sm text-purple-600">
          No papers specified in this motion&apos;s voting order.
        </p>
      </div>
    );
  }

  if (delegates.length === 0) {
    return (
      <div className="mt-4 border-t border-purple-100 pt-4">
        <p className="text-sm text-purple-600">
          No delegates are marked present on the latest roll call (
          {rollCall.label}).
        </p>
      </div>
    );
  }

  const currentPaperId = paperIds[paperIndex];
  const currentDoc = activeCommittee.documents.find(
    (d) => d.id === currentPaperId
  );
  const currentDelegate = delegates[delegateIndex];
  const attendance = rollCall.attendance[currentDelegate.id];
  const canAbstain = canDelegateAbstainOnRollCall(rollCall, currentDelegate.id);
  const docVotes = savedRollCallVotes[currentPaperId] ?? {};
  const currentVote = docVotes[currentDelegate.id];
  const votesRecordedForPaper = Object.keys(docVotes).length;
  const allPapersComplete = paperIds.every((id) => {
    const votes = savedRollCallVotes[id] ?? {};
    return delegates.every((d) => votes[d.id]);
  });

  const castVote = (vote: DelegatePaperVote) => {
    setMotionRollCallVote(motion.id, currentPaperId, currentDelegate.id, vote);

    const isLastDelegate = delegateIndex >= delegates.length - 1;
    if (!isLastDelegate) {
      setDelegateIndex(delegateIndex + 1);
      return;
    }

    const isLastPaper = paperIndex >= paperIds.length - 1;
    if (!isLastPaper) {
      setPaperIndex(paperIndex + 1);
      setDelegateIndex(0);
    }
  };

  const goBack = () => {
    if (delegateIndex > 0) {
      setDelegateIndex(delegateIndex - 1);
      return;
    }
    if (paperIndex > 0) {
      setPaperIndex(paperIndex - 1);
      setDelegateIndex(delegates.length - 1);
    }
  };

  const canGoBack = paperIndex > 0 || delegateIndex > 0;

  return (
    <div className="mt-4 border-t border-purple-100 pt-4">
      <h4 className="mb-1 font-semibold text-purple-900">Roll Call Voting</h4>
      <p className="mb-3 text-sm text-purple-600">
        Record each delegate&apos;s vote in roll-call order from{" "}
        <span className="font-medium">{rollCall.label}</span>. Present &amp;
        Voting delegates must vote yes or no; present delegates may abstain.
        Counts below update automatically.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge color="purple">
          Paper {paperIndex + 1} of {paperIds.length}
        </Badge>
        <Badge color="purple">
          Delegate {delegateIndex + 1} of {delegates.length}
        </Badge>
        {allPapersComplete && (
          <Badge color="green">All votes recorded</Badge>
        )}
      </div>

      <div className="rounded-lg border-2 border-purple-300 bg-purple-50 p-4">
        <p className="mb-1 text-sm text-purple-600">
          Voting on:{" "}
          <span className="font-medium text-purple-900">
            {currentDoc?.title ?? "Unknown document"}
          </span>
        </p>
        <p className="mb-3 text-2xl font-bold text-purple-900">
          {currentDelegate.country}
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge
            color={attendance === "present_voting" ? "green" : "purple"}
          >
            {attendance === "present_voting"
              ? "Present & Voting"
              : "Present"}
          </Badge>
          {currentVote && (
            <Badge color="gray">Recorded: {VOTE_LABELS[currentVote]}</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={currentVote === "yes" ? "primary" : "secondary"}
            onClick={() => castVote("yes")}
          >
            Yes
          </Button>
          <Button
            variant={currentVote === "no" ? "primary" : "secondary"}
            onClick={() => castVote("no")}
          >
            No
          </Button>
          {canAbstain && (
            <Button
              variant={currentVote === "abstain" ? "primary" : "secondary"}
              onClick={() => castVote("abstain")}
            >
              Abstain
            </Button>
          )}
        </div>

        {canGoBack && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={goBack}
          >
            Previous delegate
          </Button>
        )}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-purple-800">
          Progress for current paper ({votesRecordedForPaper}/{delegates.length})
        </p>
        <div className="flex flex-wrap gap-1">
          {delegates.map((d, i) => {
            const vote = docVotes[d.id];
            const isCurrent = i === delegateIndex;
            return (
              <span
                key={d.id}
                title={
                  vote
                    ? `${d.country}: ${VOTE_LABELS[vote]}`
                    : d.country
                }
                className={`rounded px-2 py-0.5 text-xs ${
                  isCurrent
                    ? "bg-purple-600 text-white"
                    : vote === "yes"
                      ? "bg-green-100 text-green-800"
                      : vote === "no"
                        ? "bg-red-100 text-red-800"
                        : vote === "abstain"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-purple-100 text-purple-600"
                }`}
              >
                {d.country.split(" ").slice(-1)[0]}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
