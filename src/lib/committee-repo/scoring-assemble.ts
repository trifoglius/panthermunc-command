import { asc, eq } from "drizzle-orm";
import {
  db,
  positionPaperScores,
  rubricScores,
  type DbExecutor,
} from "@/db";
import type { PositionPaperScore, RubricScore } from "@/lib/types";
import {
  emptyScoringEntityVersions,
  rubricKey,
  type ScoringEntityVersions,
} from "@/lib/committee-sync/scoring-ops-types";

export interface AssembledScoring {
  judgeScores: RubricScore[];
  daisScores: RubricScore[];
  positionPaperScores: PositionPaperScore[];
  entityVersions: ScoringEntityVersions;
}

/**
 * Rebuild the client-facing scoring slice from the normalized scoring tables,
 * splitting rubric rows into judge/dais lists and collecting per-entity
 * versions for optimistic concurrency.
 */
export async function assembleScoring(
  committeeId: string,
  executor: DbExecutor = db
): Promise<AssembledScoring> {
  const entityVersions = emptyScoringEntityVersions();

  const [rubricRows, paperRows] = await Promise.all([
    executor
      .select()
      .from(rubricScores)
      .where(eq(rubricScores.committeeId, committeeId))
      .orderBy(asc(rubricScores.createdAt)),
    executor
      .select()
      .from(positionPaperScores)
      .where(eq(positionPaperScores.committeeId, committeeId))
      .orderBy(asc(positionPaperScores.createdAt)),
  ]);

  const judgeScores: RubricScore[] = [];
  const daisScores: RubricScore[] = [];
  for (const row of rubricRows) {
    entityVersions.rubric[rubricKey(row.role, row.delegateId)] = row.version;
    if (row.role === "judge") judgeScores.push(row.data);
    else daisScores.push(row.data);
  }

  const positionPaperList = paperRows.map((row) => {
    entityVersions.positionPaper[row.delegateId] = row.version;
    return row.data;
  });

  return {
    judgeScores,
    daisScores,
    positionPaperScores: positionPaperList,
    entityVersions,
  };
}
