import type { CommitteeData } from "@/db/schema";
import type { RollCallStatus } from "@/lib/types";
import { deepEqualData } from "./conflict";
import type { FloorEntityVersions, FloorOp } from "./floor-ops-types";

/** Committee-data keys owned by the normalized floor tables (Phase 3). */
export const FLOOR_KEYS = [
  "delegates",
  "motions",
  "motionSessionState",
  "motionQueueHistory",
  "rollCalls",
  "points",
  "speakingEvents",
  "documents",
] as const;

export const FLOOR_KEY_SET = new Set<keyof CommitteeData>(FLOOR_KEYS);

/**
 * Compute the minimal set of floor operations that transforms `base` (the last
 * synced server snapshot) into `local` (current client state). Versioned
 * entities carry the version the client last saw so the server can detect
 * same-entity conflicts; append-only collections only emit inserts for ids not
 * already present in the base.
 */
export function diffFloor(
  base: CommitteeData,
  local: CommitteeData,
  versions: FloorEntityVersions
): FloorOp[] {
  const ops: FloorOp[] = [];

  // --- Delegates (upsert + delete) ---
  const baseDelegates = new Map(base.delegates.map((d) => [d.id, d]));
  const localDelegates = new Map(local.delegates.map((d) => [d.id, d]));
  for (const [id, delegate] of localDelegates) {
    const prev = baseDelegates.get(id);
    if (!prev) {
      ops.push({ domain: "delegate", action: "upsert", id, version: 0, data: delegate });
    } else if (!deepEqualData(prev, delegate)) {
      ops.push({
        domain: "delegate",
        action: "upsert",
        id,
        version: versions.delegates[id] ?? 0,
        data: delegate,
      });
    }
  }
  for (const id of baseDelegates.keys()) {
    if (!localDelegates.has(id)) {
      ops.push({
        domain: "delegate",
        action: "delete",
        id,
        version: versions.delegates[id] ?? 0,
      });
    }
  }

  // --- Motions (data + session state, upsert + delete) ---
  const baseMotions = new Map(base.motions.map((m) => [m.id, m]));
  const localMotions = new Map(local.motions.map((m) => [m.id, m]));
  const baseSessionState = base.motionSessionState ?? {};
  const localSessionState = local.motionSessionState ?? {};
  for (const [id, motion] of localMotions) {
    const prev = baseMotions.get(id);
    const sessionState = localSessionState[id] ?? {};
    if (!prev) {
      ops.push({
        domain: "motion",
        action: "upsert",
        id,
        version: 0,
        data: motion,
        sessionState,
      });
    } else {
      const dataChanged = !deepEqualData(prev, motion);
      const sessionChanged = !deepEqualData(baseSessionState[id] ?? {}, sessionState);
      if (dataChanged || sessionChanged) {
        ops.push({
          domain: "motion",
          action: "upsert",
          id,
          version: versions.motions[id] ?? 0,
          data: motion,
          sessionState,
        });
      }
    }
  }
  for (const id of baseMotions.keys()) {
    if (!localMotions.has(id)) {
      ops.push({
        domain: "motion",
        action: "delete",
        id,
        version: versions.motions[id] ?? 0,
      });
    }
  }

  // --- Points (upsert only; points are never deleted in the UI) ---
  const basePoints = new Map(base.points.map((p) => [p.id, p]));
  for (const point of local.points) {
    const prev = basePoints.get(point.id);
    if (!prev) {
      ops.push({ domain: "point", action: "upsert", id: point.id, version: 0, data: point });
    } else if (!deepEqualData(prev, point)) {
      ops.push({
        domain: "point",
        action: "upsert",
        id: point.id,
        version: versions.points[point.id] ?? 0,
        data: point,
      });
    }
  }

  // --- Documents (upsert + delete) ---
  // The client may stamp an optimistic submissionNumber for immediate UI, but
  // the server owns the authoritative atomic counter and overrides it on
  // upsert; the corrected value returns on the post-save re-sync.
  const baseDocuments = new Map(base.documents.map((d) => [d.id, d]));
  const localDocuments = new Map(local.documents.map((d) => [d.id, d]));
  for (const [id, document] of localDocuments) {
    const prev = baseDocuments.get(id);
    if (!prev) {
      ops.push({
        domain: "document",
        action: "upsert",
        id,
        version: 0,
        data: document,
      });
    } else if (!deepEqualData(prev, document)) {
      ops.push({
        domain: "document",
        action: "upsert",
        id,
        version: versions.documents[id] ?? 0,
        data: document,
      });
    }
  }
  for (const id of baseDocuments.keys()) {
    if (!localDocuments.has(id)) {
      ops.push({
        domain: "document",
        action: "delete",
        id,
        version: versions.documents[id] ?? 0,
      });
    }
  }

  // --- Roll-call sessions (label upsert) + attendance (append events) ---
  const baseSessions = new Map(base.rollCalls.map((s) => [s.id, s]));
  for (const session of local.rollCalls) {
    const prev = baseSessions.get(session.id);
    if (!prev) {
      ops.push({
        domain: "rollCallSession",
        action: "upsert",
        id: session.id,
        version: 0,
        label: session.label,
        timestamp: session.timestamp,
        quorumMet: session.quorumMet,
      });
    } else if (prev.label !== session.label) {
      ops.push({
        domain: "rollCallSession",
        action: "upsert",
        id: session.id,
        version: versions.rollCallSessions[session.id] ?? 0,
        label: session.label,
        timestamp: session.timestamp,
        quorumMet: session.quorumMet,
      });
    }

    const prevAttendance = prev?.attendance ?? {};
    const nextAttendance = session.attendance ?? {};
    const delegateIds = new Set([
      ...Object.keys(prevAttendance),
      ...Object.keys(nextAttendance),
    ]);
    for (const delegateId of delegateIds) {
      const before = (prevAttendance[delegateId] ?? "absent") as RollCallStatus;
      const after = (nextAttendance[delegateId] ?? "absent") as RollCallStatus;
      if (before !== after) {
        ops.push({
          domain: "attendance",
          action: "mark",
          sessionId: session.id,
          delegateId,
          status: after,
        });
      }
    }
  }

  // --- Speaking events (append only) ---
  const baseSpeaking = new Set(base.speakingEvents.map((e) => e.id));
  for (const event of local.speakingEvents) {
    if (!baseSpeaking.has(event.id)) {
      ops.push({ domain: "speakingEvent", action: "append", id: event.id, data: event });
    }
  }

  // --- Motion queue history (append only) ---
  const baseHistory = new Set((base.motionQueueHistory ?? []).map((h) => h.id));
  for (const snapshot of local.motionQueueHistory ?? []) {
    if (!baseHistory.has(snapshot.id)) {
      ops.push({
        domain: "motionQueueSnapshot",
        action: "append",
        id: snapshot.id,
        data: snapshot,
      });
    }
  }

  return ops;
}
