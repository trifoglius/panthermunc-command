import type { CommitteeData } from "@/db/schema";
import type { RubricScore, ScorerRole } from "@/lib/types";
import { deepEqualData } from "./conflict";
import {
  rubricKey,
  type ScoringEntityVersions,
  type ScoringOp,
} from "./scoring-ops-types";

/** Committee-data keys owned by the normalized scoring tables (Phase 5). */
export const SCORING_ENTITY_KEYS = [
  "judgeScores",
  "daisScores",
  "positionPaperScores",
] as const;

export const SCORING_ENTITY_KEY_SET = new Set<keyof CommitteeData>(
  SCORING_ENTITY_KEYS
);

function diffRubric(
  role: ScorerRole,
  base: RubricScore[],
  local: RubricScore[],
  versions: ScoringEntityVersions,
  ops: ScoringOp[]
): void {
  const baseByDelegate = new Map(base.map((s) => [s.delegateId, s]));
  for (const score of local) {
    const prev = baseByDelegate.get(score.delegateId);
    if (!prev) {
      ops.push({
        domain: "rubric",
        role,
        delegateId: score.delegateId,
        version: 0,
        data: score,
      });
    } else if (!deepEqualData(prev, score)) {
      ops.push({
        domain: "rubric",
        role,
        delegateId: score.delegateId,
        version: versions.rubric[rubricKey(role, score.delegateId)] ?? 0,
        data: score,
      });
    }
  }
}

/**
 * Compute the minimal set of scoring operations that transforms `base` (the
 * last synced server snapshot) into `local`. Scores are upsert-only.
 */
export function diffScoring(
  base: CommitteeData,
  local: CommitteeData,
  versions: ScoringEntityVersions
): ScoringOp[] {
  const ops: ScoringOp[] = [];

  diffRubric("judge", base.judgeScores, local.judgeScores, versions, ops);
  diffRubric("dais", base.daisScores, local.daisScores, versions, ops);

  const basePapers = new Map(
    base.positionPaperScores.map((s) => [s.delegateId, s])
  );
  for (const score of local.positionPaperScores) {
    const prev = basePapers.get(score.delegateId);
    if (!prev) {
      ops.push({
        domain: "positionPaper",
        delegateId: score.delegateId,
        version: 0,
        data: score,
      });
    } else if (!deepEqualData(prev, score)) {
      ops.push({
        domain: "positionPaper",
        delegateId: score.delegateId,
        version: versions.positionPaper[score.delegateId] ?? 0,
        data: score,
      });
    }
  }

  return ops;
}
