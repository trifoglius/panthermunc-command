import type { PositionPaperScore, RubricScore, ScorerRole } from "@/lib/types";

/**
 * Wire contract for normalized scoring writes (Phase 5). Scoring is decoupled
 * from floor operations: registrars send minimal per-entity upserts computed by
 * diffing local scoring state against their last-synced base, and the server
 * applies them with per-entity optimistic version checks. Because these never
 * gate on the floor/committee version, concurrent chair floor edits can no
 * longer bounce a registrar's score save with a 409.
 *
 * Scores are never deleted in the UI, so upsert is the only action.
 */
export type ScoringOp =
  | {
      domain: "rubric";
      role: ScorerRole;
      delegateId: string;
      version: number;
      data: RubricScore;
    }
  | {
      domain: "positionPaper";
      delegateId: string;
      version: number;
      data: PositionPaperScore;
    };

/**
 * Per-entity scoring versions the client tracks to drive optimistic
 * concurrency. Rubric rows are keyed by `${role}:${delegateId}`; position-paper
 * rows by `delegateId`.
 */
export interface ScoringEntityVersions {
  rubric: Record<string, number>;
  positionPaper: Record<string, number>;
}

export function emptyScoringEntityVersions(): ScoringEntityVersions {
  return { rubric: {}, positionPaper: {} };
}

/** Composite key for a rubric entity in {@link ScoringEntityVersions.rubric}. */
export function rubricKey(role: ScorerRole, delegateId: string): string {
  return `${role}:${delegateId}`;
}

/** Response from the scoring-ops endpoint. */
export interface ScoringOpsResult {
  /** New committee row version (bumped so pollers detect the change). */
  committeeVersion: number;
  /** Updated per-entity scoring versions after applying the ops. */
  scoringEntityVersions: ScoringEntityVersions;
  /** True when any op hit a stale entity version and the client must refresh. */
  conflict: boolean;
}
