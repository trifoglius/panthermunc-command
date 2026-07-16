import { eq } from "drizzle-orm";
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
  type CommitteeRow,
  type Transaction,
} from "@/db";
import type { RollCallStatus } from "@/lib/types";

/** Offsets stay well under a second so all synthetic times precede live now(). */
function tsAsc(baseMs: number, index: number): Date {
  return new Date(baseMs + index);
}
function tsDesc(baseMs: number, len: number, index: number): Date {
  return new Date(baseMs + (len - index));
}

/**
 * Copy the JSONB blob's floor data into the normalized tables, preserving the
 * existing display order via synthetic timestamps. Runs inside the caller's
 * transaction (which already holds a row lock on the committee).
 */
async function backfillFloor(
  tx: Transaction,
  committee: CommitteeRow
): Promise<{ nextDraftSubmissionOrder: number }> {
  const data = committee.data;
  const baseMs = new Date(committee.createdAt).getTime();

  // Delegates: displayed oldest-first (append order).
  if (data.delegates?.length) {
    await tx.insert(delegates).values(
      data.delegates.map((d, i) => ({
        id: d.id,
        committeeId: committee.id,
        data: d,
        version: 0,
        createdAt: tsAsc(baseMs, i),
      }))
    );
  }

  // Motions: displayed newest-first (prepend order).
  if (data.motions?.length) {
    const len = data.motions.length;
    await tx.insert(motions).values(
      data.motions.map((m, i) => ({
        id: m.id,
        committeeId: committee.id,
        data: m,
        sessionState: data.motionSessionState?.[m.id] ?? {},
        version: 0,
        createdAt: tsDesc(baseMs, len, i),
      }))
    );
  }

  if (data.motionQueueHistory?.length) {
    const len = data.motionQueueHistory.length;
    await tx.insert(motionQueueHistory).values(
      data.motionQueueHistory.map((h, i) => ({
        id: h.id,
        committeeId: committee.id,
        data: h,
        createdAt: tsDesc(baseMs, len, i),
      }))
    );
  }

  if (data.rollCalls?.length) {
    const len = data.rollCalls.length;
    await tx.insert(rollCallSessions).values(
      data.rollCalls.map((s, i) => ({
        id: s.id,
        committeeId: committee.id,
        label: s.label,
        timestamp: s.timestamp,
        quorumMet: s.quorumMet,
        version: 0,
        createdAt: tsDesc(baseMs, len, i),
      }))
    );

    // One attendance event per non-absent mark; absent is the read-time default.
    const events = data.rollCalls.flatMap((s) => {
      const recordedAt = Number.isNaN(new Date(s.timestamp).getTime())
        ? new Date(baseMs)
        : new Date(s.timestamp);
      return Object.entries(s.attendance ?? {})
        .filter(([, status]) => (status as RollCallStatus) !== "absent")
        .map(([delegateId, status]) => ({
          sessionId: s.id,
          delegateId,
          status: status as RollCallStatus,
          recordedAt,
          recordedBy: null,
        }));
    });
    if (events.length) {
      await tx.insert(rollCallAttendanceEvents).values(events);
    }
  }

  if (data.points?.length) {
    const len = data.points.length;
    await tx.insert(points).values(
      data.points.map((p, i) => ({
        id: p.id,
        committeeId: committee.id,
        data: p,
        version: 0,
        createdAt: tsDesc(baseMs, len, i),
      }))
    );
  }

  if (data.speakingEvents?.length) {
    const len = data.speakingEvents.length;
    await tx.insert(speakingEvents).values(
      data.speakingEvents.map((e, i) => ({
        id: e.id,
        committeeId: committee.id,
        data: e,
        createdAt: tsDesc(baseMs, len, i),
      }))
    );
  }

  // Documents: displayed newest-first (prepend order).
  if (data.documents?.length) {
    const len = data.documents.length;
    await tx.insert(documents).values(
      data.documents.map((d, i) => ({
        id: d.id,
        committeeId: committee.id,
        data: d,
        submissionNumber: d.submissionNumber ?? null,
        version: 0,
        createdAt: tsDesc(baseMs, len, i),
      }))
    );
  }

  // Seed the atomic submission counter from the blob's prior stopgap value,
  // falling back to the highest submission number already assigned.
  const maxAssigned = (data.documents ?? []).reduce(
    (max, d) => Math.max(max, d.submissionNumber ?? 0),
    0
  );
  const nextOrder = Math.max(data.nextDraftSubmissionOrder ?? 0, maxAssigned);

  await tx
    .update(committees)
    .set({ floorMigrated: true, nextDraftSubmissionOrder: nextOrder })
    .where(eq(committees.id, committee.id));

  return { nextDraftSubmissionOrder: nextOrder };
}

/**
 * Lock the committee row and backfill floor data if not yet migrated. Must run
 * inside a transaction; the `FOR UPDATE` lock also serializes concurrent floor
 * writes to the same committee, keeping per-entity version checks race-free.
 * Returns the locked committee row (already reflecting `floorMigrated: true`).
 */
export async function lockAndEnsureFloorMigrated(
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
  if (committee.floorMigrated) return committee;

  const { nextDraftSubmissionOrder } = await backfillFloor(tx, committee);
  return { ...committee, floorMigrated: true, nextDraftSubmissionOrder };
}

/**
 * Ensure a committee's floor data lives in the normalized tables. Idempotent
 * and race-safe. Returns the (possibly updated) committee row.
 */
export async function ensureFloorMigrated(
  committeeId: string
): Promise<CommitteeRow | undefined> {
  return withTransaction((tx) => lockAndEnsureFloorMigrated(tx, committeeId));
}
