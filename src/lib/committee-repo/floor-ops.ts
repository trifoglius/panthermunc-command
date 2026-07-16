import { and, eq } from "drizzle-orm";
import {
  committees,
  delegates,
  documents,
  motions,
  motionQueueHistory,
  points,
  rollCallAttendanceEvents,
  rollCallSessions,
  speakingEvents,
  withTransaction,
} from "@/db";
import type { Document } from "@/lib/types";
import type { FloorOp, FloorOpsResult } from "@/lib/committee-sync/floor-ops-types";
import { assembleFloor } from "./floor-assemble";
import { lockAndEnsureFloorMigrated } from "./floor-backfill";

export type ApplyFloorOpsResult =
  | ({ ok: true } & FloorOpsResult)
  | { ok: false; reason: "notFound" };

/**
 * Apply a batch of floor operations transactionally.
 *
 * Versioned entities (delegate/motion/point/rollCallSession) are guarded by
 * per-entity optimistic versions: ops targeting a stale entity are skipped and
 * flagged as a conflict so the client hard-refreshes, while disjoint ops in the
 * same batch still commit. Append-only ops (attendance/speaking/queue) always
 * insert. After applying, the JSONB blob is re-mirrored from the tables and the
 * committee `version` is bumped so pollers detect the change.
 */
export async function applyFloorOps(
  committeeId: string,
  recordedBy: string | null,
  ops: FloorOp[]
): Promise<ApplyFloorOpsResult> {
  return withTransaction(async (tx) => {
    const committee = await lockAndEnsureFloorMigrated(tx, committeeId);
    if (!committee) return { ok: false, reason: "notFound" };

    let conflict = false;
    // The committee row is locked FOR UPDATE, so concurrent floor-ops batches
    // for this committee serialize here; tracking the counter in-memory and
    // writing it back once is safe and keeps submission numbers gap-free.
    let nextDraftSubmissionOrder = committee.nextDraftSubmissionOrder;

    for (const op of ops) {
      switch (op.domain) {
        case "delegate": {
          if (op.action === "delete") {
            const [existing] = await tx
              .select({ version: delegates.version })
              .from(delegates)
              .where(eq(delegates.id, op.id))
              .limit(1);
            if (existing && existing.version !== op.version) {
              conflict = true;
              break;
            }
            await tx.delete(delegates).where(eq(delegates.id, op.id));
            break;
          }
          const [existing] = await tx
            .select({ version: delegates.version })
            .from(delegates)
            .where(eq(delegates.id, op.id))
            .limit(1);
          if (!existing) {
            await tx.insert(delegates).values({
              id: op.id,
              committeeId,
              data: op.data,
              version: 0,
            });
          } else if (existing.version !== op.version) {
            conflict = true;
          } else {
            await tx
              .update(delegates)
              .set({ data: op.data, version: existing.version + 1 })
              .where(
                and(eq(delegates.id, op.id), eq(delegates.version, op.version))
              );
          }
          break;
        }

        case "motion": {
          if (op.action === "delete") {
            const [existing] = await tx
              .select({ version: motions.version })
              .from(motions)
              .where(eq(motions.id, op.id))
              .limit(1);
            if (existing && existing.version !== op.version) {
              conflict = true;
              break;
            }
            await tx.delete(motions).where(eq(motions.id, op.id));
            break;
          }
          const [existing] = await tx
            .select({ version: motions.version })
            .from(motions)
            .where(eq(motions.id, op.id))
            .limit(1);
          if (!existing) {
            await tx.insert(motions).values({
              id: op.id,
              committeeId,
              data: op.data,
              sessionState: op.sessionState,
              version: 0,
            });
          } else if (existing.version !== op.version) {
            conflict = true;
          } else {
            await tx
              .update(motions)
              .set({
                data: op.data,
                sessionState: op.sessionState,
                version: existing.version + 1,
              })
              .where(
                and(eq(motions.id, op.id), eq(motions.version, op.version))
              );
          }
          break;
        }

        case "point": {
          const [existing] = await tx
            .select({ version: points.version })
            .from(points)
            .where(eq(points.id, op.id))
            .limit(1);
          if (!existing) {
            await tx.insert(points).values({
              id: op.id,
              committeeId,
              data: op.data,
              version: 0,
            });
          } else if (existing.version !== op.version) {
            conflict = true;
          } else {
            await tx
              .update(points)
              .set({ data: op.data, version: existing.version + 1 })
              .where(and(eq(points.id, op.id), eq(points.version, op.version)));
          }
          break;
        }

        case "document": {
          if (op.action === "delete") {
            const [existing] = await tx
              .select({ version: documents.version })
              .from(documents)
              .where(eq(documents.id, op.id))
              .limit(1);
            if (existing && existing.version !== op.version) {
              conflict = true;
              break;
            }
            await tx.delete(documents).where(eq(documents.id, op.id));
            break;
          }
          const [existing] = await tx
            .select({
              version: documents.version,
              submissionNumber: documents.submissionNumber,
            })
            .from(documents)
            .where(eq(documents.id, op.id))
            .limit(1);

          // Server owns the submission number: keep any already-assigned value,
          // otherwise allocate the next atomic number for draft resolutions.
          let assigned: number | null = existing?.submissionNumber ?? null;
          if (assigned == null && op.data.type === "draft_resolution") {
            nextDraftSubmissionOrder += 1;
            assigned = nextDraftSubmissionOrder;
          }
          const data: Document =
            assigned != null
              ? { ...op.data, submissionNumber: assigned }
              : { ...op.data, submissionNumber: undefined };

          if (!existing) {
            await tx.insert(documents).values({
              id: op.id,
              committeeId,
              data,
              submissionNumber: assigned,
              version: 0,
            });
          } else if (existing.version !== op.version) {
            conflict = true;
          } else {
            await tx
              .update(documents)
              .set({
                data,
                submissionNumber: assigned,
                version: existing.version + 1,
              })
              .where(
                and(eq(documents.id, op.id), eq(documents.version, op.version))
              );
          }
          break;
        }

        case "rollCallSession": {
          const [existing] = await tx
            .select({ version: rollCallSessions.version })
            .from(rollCallSessions)
            .where(eq(rollCallSessions.id, op.id))
            .limit(1);
          if (!existing) {
            await tx.insert(rollCallSessions).values({
              id: op.id,
              committeeId,
              label: op.label,
              timestamp: op.timestamp,
              quorumMet: op.quorumMet,
              version: 0,
            });
          } else if (existing.version !== op.version) {
            conflict = true;
          } else {
            // quorumMet is derived at read time; only label is mutable here.
            await tx
              .update(rollCallSessions)
              .set({ label: op.label, version: existing.version + 1 })
              .where(
                and(
                  eq(rollCallSessions.id, op.id),
                  eq(rollCallSessions.version, op.version)
                )
              );
          }
          break;
        }

        case "attendance": {
          await tx.insert(rollCallAttendanceEvents).values({
            sessionId: op.sessionId,
            delegateId: op.delegateId,
            status: op.status,
            recordedBy,
          });
          break;
        }

        case "speakingEvent": {
          await tx
            .insert(speakingEvents)
            .values({ id: op.id, committeeId, data: op.data })
            .onConflictDoNothing();
          break;
        }

        case "motionQueueSnapshot": {
          await tx
            .insert(motionQueueHistory)
            .values({ id: op.id, committeeId, data: op.data })
            .onConflictDoNothing();
          break;
        }
      }
    }

    // Re-assemble the floor slice (sees this transaction's writes) to return
    // fresh per-entity versions. Post-cutover (Phase 7) the tables are the sole
    // source of truth, so we no longer mirror back into the JSONB blob; we only
    // bump the committee version so pollers detect the change.
    const floor = await assembleFloor(committeeId, tx);

    const [updated] = await tx
      .update(committees)
      .set({
        version: committee.version + 1,
        nextDraftSubmissionOrder,
        updatedAt: new Date(),
      })
      .where(eq(committees.id, committeeId))
      .returning({ version: committees.version });

    return {
      ok: true,
      committeeVersion: updated?.version ?? committee.version + 1,
      entityVersions: floor.entityVersions,
      conflict,
    };
  });
}
