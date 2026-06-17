"use client";

import { useEffect, useMemo, useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { Badge, Button, Input } from "@/components/ui";
import {
  parseDocumentOrder,
  draftResolutionPasses,
  requiredYesForSupermajority,
  isVoteByRollCall,
} from "@/lib/voting";
import { firePassingVoteConfetti } from "@/lib/confetti";
import type { Motion, PaperVoteRecord } from "@/lib/types";

export function VotingPapersPanel({ motion }: { motion: Motion }) {
  const { activeCommittee, setMotionPaperVotes, updateDocument } =
    useConference();
  const savedVotes =
    activeCommittee?.motionSessionState?.[motion.id]?.paperVotes ?? [];

  const paperIds = useMemo(
    () => parseDocumentOrder(motion.details.paper_order),
    [motion.details.paper_order]
  );

  const [votes, setVotes] = useState<PaperVoteRecord[]>(() => {
    const byId = new Map(savedVotes.map((v) => [v.documentId, v]));
    return paperIds.map(
      (id) =>
        byId.get(id) ?? {
          documentId: id,
          votesFor: 0,
          votesAgainst: 0,
          votesAbstain: 0,
        }
    );
  });
  const [applied, setApplied] = useState(false);
  const rollCallMode = isVoteByRollCall(motion);

  useEffect(() => {
    const byId = new Map(savedVotes.map((v) => [v.documentId, v]));
    setVotes(
      paperIds.map(
        (id) =>
          byId.get(id) ?? {
            documentId: id,
            votesFor: 0,
            votesAgainst: 0,
            votesAbstain: 0,
          }
      )
    );
  }, [savedVotes, paperIds]);

  if (!activeCommittee) return null;

  if (paperIds.length === 0) {
    return (
      <div className="mt-4 border-t border-purple-100 pt-4">
        <p className="text-sm text-purple-600">
          No papers specified in this motion&apos;s voting order. Add draft
          resolutions to the &quot;Order of papers to vote&quot; field when
          proposing the motion.
        </p>
      </div>
    );
  }

  const persistVotes = (next: PaperVoteRecord[]) => {
    setVotes(next);
    setMotionPaperVotes(motion.id, next);
    setApplied(false);
  };

  const updateVote = (
    documentId: string,
    field: keyof Omit<PaperVoteRecord, "documentId">,
    raw: string
  ) => {
    const value = Math.max(0, Number.parseInt(raw, 10) || 0);
    persistVotes(
      votes.map((v) =>
        v.documentId === documentId ? { ...v, [field]: value } : v
      )
    );
  };

  const allPapersVoted = votes.every(
    (v) => v.votesFor + v.votesAgainst + v.votesAbstain > 0
  );

  const applyResults = () => {
    let anyPassed = false;
    for (const vote of votes) {
      const doc = activeCommittee.documents.find(
        (d) => d.id === vote.documentId
      );
      if (!doc) continue;
      const passes = draftResolutionPasses(vote.votesFor, vote.votesAgainst);
      if (passes) anyPassed = true;
      updateDocument({
        ...doc,
        status: passes ? "adopted" : "failed",
      });
    }
    setApplied(true);
    if (anyPassed) {
      firePassingVoteConfetti();
    }
  };

  return (
    <div className="mt-4 border-t border-purple-100 pt-4">
      <h4 className="mb-1 font-semibold text-purple-900">Paper Votes</h4>
      <p className="mb-3 text-sm text-purple-600">
        {rollCallMode
          ? "Vote counts are filled automatically from roll call voting above."
          : "Log yes, no, and abstain counts for each draft resolution. Abstentions are excluded when determining the two-thirds majority required for adoption."}
      </p>
      <div className="space-y-4">
        {votes.map((vote, index) => {
          const doc = activeCommittee.documents.find(
            (d) => d.id === vote.documentId
          );
          const required = requiredYesForSupermajority(
            vote.votesFor,
            vote.votesAgainst
          );
          const votesCast = vote.votesFor + vote.votesAgainst;
          const passes =
            votesCast > 0 &&
            draftResolutionPasses(vote.votesFor, vote.votesAgainst);

          return (
            <div
              key={vote.documentId}
              className="rounded-lg border border-purple-100 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-purple-900">
                  {index + 1}. {doc?.title ?? "Unknown document"}
                </p>
                {votesCast > 0 && (
                  <Badge color={passes ? "green" : "red"}>
                    {passes ? "Would pass" : "Would fail"} (need {required} yes)
                  </Badge>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  label="Yes"
                  type="number"
                  min={0}
                  value={vote.votesFor || ""}
                  readOnly={rollCallMode}
                  onChange={(e) =>
                    updateVote(vote.documentId, "votesFor", e.target.value)
                  }
                />
                <Input
                  label="No"
                  type="number"
                  min={0}
                  value={vote.votesAgainst || ""}
                  readOnly={rollCallMode}
                  onChange={(e) =>
                    updateVote(vote.documentId, "votesAgainst", e.target.value)
                  }
                />
                <Input
                  label="Abstain"
                  type="number"
                  min={0}
                  value={vote.votesAbstain || ""}
                  readOnly={rollCallMode}
                  onChange={(e) =>
                    updateVote(vote.documentId, "votesAbstain", e.target.value)
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={applyResults} disabled={!allPapersVoted || applied}>
          {applied ? "Results Applied" : "Apply Results to Documents"}
        </Button>
        {!allPapersVoted && (
          <p className="text-sm text-purple-600">
            Enter vote counts for every paper before applying.
          </p>
        )}
      </div>
    </div>
  );
}
