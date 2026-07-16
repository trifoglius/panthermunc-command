import { eq } from "drizzle-orm";
import {
  committees,
  positionPaperScores,
  rubricScores,
  withTransaction,
  type CommitteeRow,
  type Transaction,
} from "@/db";

/**
 * Copy the JSONB blob's scoring data into the normalized scoring tables. Runs
 * inside the caller's transaction (which already holds a row lock on the
 * committee), so the migration is idempotent and race-safe.
 */
async function backfillScoring(
  tx: Transaction,
  committee: CommitteeRow
): Promise<void> {
  const data = committee.data;

  const rubricRows = [
    ...(data.judgeScores ?? []).map((s) => ({
      committeeId: committee.id,
      role: "judge" as const,
      delegateId: s.delegateId,
      data: s,
      version: 0,
    })),
    ...(data.daisScores ?? []).map((s) => ({
      committeeId: committee.id,
      role: "dais" as const,
      delegateId: s.delegateId,
      data: s,
      version: 0,
    })),
  ];
  if (rubricRows.length) {
    await tx.insert(rubricScores).values(rubricRows);
  }

  if (data.positionPaperScores?.length) {
    await tx.insert(positionPaperScores).values(
      data.positionPaperScores.map((s) => ({
        committeeId: committee.id,
        delegateId: s.delegateId,
        data: s,
        version: 0,
      }))
    );
  }

  await tx
    .update(committees)
    .set({ scoringMigrated: true })
    .where(eq(committees.id, committee.id));
}

/**
 * Lock the committee row and backfill scoring data if not yet migrated. Must run
 * inside a transaction; the `FOR UPDATE` lock serializes concurrent scoring
 * writes to the same committee, keeping per-entity version checks race-free.
 */
export async function lockAndEnsureScoringMigrated(
  tx: Transaction,
  committeeId: string
): Promise<CommitteeRow | undefined> {
  const [committee] = await tx
    .select()
    .from(committees)
    .where(eq(committees.id, committeeId))
    .limit(1)
    .for("update");

  if (!committee) return undefined;
  if (committee.scoringMigrated) return committee;

  await backfillScoring(tx, committee);
  return { ...committee, scoringMigrated: true };
}

/**
 * Ensure a committee's scoring data lives in the normalized tables. Idempotent
 * and race-safe. Returns the (possibly updated) committee row.
 */
export async function ensureScoringMigrated(
  committeeId: string
): Promise<CommitteeRow | undefined> {
  return withTransaction((tx) => lockAndEnsureScoringMigrated(tx, committeeId));
}
