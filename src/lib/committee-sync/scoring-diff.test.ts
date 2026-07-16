import { describe, expect, it } from "vitest";
import type { CommitteeData } from "@/db/schema";
import type { RubricScore } from "@/lib/types";
import { diffScoring } from "./scoring-diff";
import { emptyScoringEntityVersions, rubricKey } from "./scoring-ops-types";

function emptyData(): CommitteeData {
  return {
    delegates: [],
    rollCalls: [],
    motions: [],
    motionQueueHistory: [],
    motionSessionState: {},
    documents: [],
    speakingEvents: [],
    points: [],
    judgeScores: [],
    daisScores: [],
    positionPaperScores: [],
    discrepancyThreshold: 10,
    requirePositionPapers: false,
    nextDraftSubmissionOrder: 0,
  };
}

function rubric(delegateId: string, total: number): RubricScore {
  return { delegateId, scores: { a: total }, total, notes: "", signed: false };
}

describe("diffScoring", () => {
  it("emits a versioned rubric upsert for an edited judge score only", () => {
    const base = emptyData();
    base.judgeScores = [rubric("d1", 5), rubric("d2", 7)];
    const local = emptyData();
    local.judgeScores = [rubric("d1", 9), rubric("d2", 7)];

    const versions = emptyScoringEntityVersions();
    versions.rubric = { [rubricKey("judge", "d1")]: 2 };

    const ops = diffScoring(base, local, versions);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      domain: "rubric",
      role: "judge",
      delegateId: "d1",
      version: 2,
    });
  });

  it("keeps judge and dais roles independent", () => {
    const base = emptyData();
    base.judgeScores = [rubric("d1", 5)];
    base.daisScores = [rubric("d1", 5)];
    const local = emptyData();
    local.judgeScores = [rubric("d1", 5)];
    local.daisScores = [rubric("d1", 8)]; // only dais changed

    const ops = diffScoring(base, local, emptyScoringEntityVersions());
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ domain: "rubric", role: "dais", delegateId: "d1" });
  });

  it("emits a position-paper upsert for a new delegate score", () => {
    const base = emptyData();
    const local = emptyData();
    local.positionPaperScores = [{ delegateId: "d1", score: 4, notes: "" }];

    const ops = diffScoring(base, local, emptyScoringEntityVersions());
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      domain: "positionPaper",
      delegateId: "d1",
      version: 0,
    });
  });

  it("returns no ops when nothing changed", () => {
    const base = emptyData();
    base.judgeScores = [rubric("d1", 5)];
    const local = emptyData();
    local.judgeScores = [rubric("d1", 5)];
    expect(diffScoring(base, local, emptyScoringEntityVersions())).toHaveLength(0);
  });
});
