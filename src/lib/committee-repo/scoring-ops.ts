import { and, eq, sql } from "drizzle-orm";
import {
  committees,
  positionPaperScores,
  rubricScores,
  withTransaction,
} from "@/db";
import type { ScoringOp, ScoringOpsResult } from "@/lib/committee-sync/scoring-ops-types";
import { assembleScoring } from "./scoring-assemble";
import { lockAndEnsureScoringMigrated } from "./scoring-backfill";

export type ApplyScoringOpsResult =
  | ({ ok: true } & ScoringOpsResult)
  | { ok: false; reason: "notFound" };

/**
 * Apply a batch of scoring operations transactionally with per-entity optimistic
 * version checks. Ops targeting a stale entity are skipped and flagged as a
 * conflict (client hard-refreshes) while disjoint ops in the same batch still
 * commit. After applying, only the scoring keys are mirrored back into the JSONB
 * blob (via `jsonb_set`, so concurrent floor writes to other keys are not
 * clobbered) and the committee `version` is bumped so pollers detect the change.
 *
 * Scoring never gates on the committee/floor version, so a concurrent chair
 * floor edit cannot bounce a registrar's score save with a 409.
 */
export async function applyScoringOps(
  committeeId: string,
  ops: ScoringOp[]
): Promise<ApplyScoringOpsResult> {
  return withTransaction(async (tx) => {
    const committee = await lockAndEnsureScoringMigrated(tx, committeeId);
    if (!committee) return { ok: false, reason: "notFound" };

    let conflict = false;

    for (const op of ops) {
      if (op.domain === "rubric") {
        const [existing] = await tx
          .select({ version: rubricScores.version })
          .from(rubricScores)
          .where(
            and(
              eq(rubricScores.committeeId, committeeId),
              eq(rubricScores.role, op.role),
              eq(rubricScores.delegateId, op.delegateId)
            )
          )
          .limit(1);
        if (!existing) {
          await tx.insert(rubricScores).values({
            committeeId,
            role: op.role,
            delegateId: op.delegateId,
            data: op.data,
            version: 0,
          });
        } else if (existing.version !== op.version) {
          conflict = true;
        } else {
          await tx
            .update(rubricScores)
            .set({ data: op.data, version: existing.version + 1 })
            .where(
              and(
                eq(rubricScores.committeeId, committeeId),
                eq(rubricScores.role, op.role),
                eq(rubricScores.delegateId, op.delegateId),
                eq(rubricScores.version, op.version)
              )
            );
        }
        continue;
      }

      // positionPaper
      const [existing] = await tx
        .select({ version: positionPaperScores.version })
        .from(positionPaperScores)
        .where(
          and(
            eq(positionPaperScores.committeeId, committeeId),
            eq(positionPaperScores.delegateId, op.delegateId)
          )
        )
        .limit(1);
      if (!existing) {
        await tx.insert(positionPaperScores).values({
          committeeId,
          delegateId: op.delegateId,
          data: op.data,
          version: 0,
        });
      } else if (existing.version !== op.version) {
        conflict = true;
      } else {
        await tx
          .update(positionPaperScores)
          .set({ data: op.data, version: existing.version + 1 })
          .where(
            and(
              eq(positionPaperScores.committeeId, committeeId),
              eq(positionPaperScores.delegateId, op.delegateId),
              eq(positionPaperScores.version, op.version)
            )
          );
      }
    }

    // Re-assemble the scoring slice (sees this transaction's writes) to return
    // fresh per-entity versions. Post-cutover (Phase 7) the scoring tables are
    // the sole source of truth, so we no longer mirror into the JSONB blob; we
    // only bump the committee version so pollers detect the change.
    const scoring = await assembleScoring(committeeId, tx);

    const [updated] = await tx
      .update(committees)
      .set({
        version: sql`${committees.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(committees.id, committeeId))
      .returning({ version: committees.version });

    return {
      ok: true,
      committeeVersion: updated?.version ?? committee.version + 1,
      scoringEntityVersions: scoring.entityVersions,
      conflict,
    };
  });
}
