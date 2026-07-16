import { asc, eq, inArray } from "drizzle-orm";
import {
  db,
  delegates,
  documents,
  motions,
  motionQueueHistory,
  points,
  rollCallAttendanceEvents,
  rollCallSessions,
  speakingEvents,
  type DbExecutor,
} from "@/db";
import type {
  Delegate,
  Document,
  Motion,
  MotionQueueSnapshot,
  MotionSessionState,
  Point,
  RollCallSession,
  RollCallStatus,
  SpeakingEvent,
} from "@/lib/types";
import {
  emptyFloorEntityVersions,
  type FloorEntityVersions,
} from "@/lib/committee-sync/floor-ops-types";

/** The floor slice of committee data, reconstructed from normalized tables. */
export interface AssembledFloor {
  delegates: Delegate[];
  motions: Motion[];
  motionSessionState: Record<string, MotionSessionState>;
  motionQueueHistory: MotionQueueSnapshot[];
  rollCalls: RollCallSession[];
  points: Point[];
  speakingEvents: SpeakingEvent[];
  documents: Document[];
  entityVersions: FloorEntityVersions;
}

function isPresent(status: RollCallStatus): boolean {
  return status === "present" || status === "present_voting";
}

/**
 * Rebuild the floor slice of a committee from its normalized tables.
 *
 * Attendance is reconstructed from the append-only event log (newest
 * `recorded_at` wins per delegate) and `quorumMet` is derived at read time, so
 * concurrent attendance marks never contend on a shared row.
 */
export async function assembleFloor(
  committeeId: string,
  executor: DbExecutor = db
): Promise<AssembledFloor> {
  const [
    delegateRows,
    motionRows,
    historyRows,
    sessionRows,
    pointRows,
    speakingRows,
    documentRows,
  ] = await Promise.all([
    executor
      .select()
      .from(delegates)
      .where(eq(delegates.committeeId, committeeId))
      .orderBy(asc(delegates.createdAt)),
    executor
      .select()
      .from(motions)
      .where(eq(motions.committeeId, committeeId))
      .orderBy(asc(motions.createdAt)),
    executor
      .select()
      .from(motionQueueHistory)
      .where(eq(motionQueueHistory.committeeId, committeeId))
      .orderBy(asc(motionQueueHistory.createdAt)),
    executor
      .select()
      .from(rollCallSessions)
      .where(eq(rollCallSessions.committeeId, committeeId))
      .orderBy(asc(rollCallSessions.createdAt)),
    executor
      .select()
      .from(points)
      .where(eq(points.committeeId, committeeId))
      .orderBy(asc(points.createdAt)),
    executor
      .select()
      .from(speakingEvents)
      .where(eq(speakingEvents.committeeId, committeeId))
      .orderBy(asc(speakingEvents.createdAt)),
    executor
      .select()
      .from(documents)
      .where(eq(documents.committeeId, committeeId))
      .orderBy(asc(documents.createdAt)),
  ]);

  const entityVersions = emptyFloorEntityVersions();

  // Delegates are displayed oldest-first (append order): createdAt ASC.
  const delegateList = delegateRows.map((row) => {
    entityVersions.delegates[row.id] = row.version;
    return row.data;
  });

  // Motions, points, sessions, speaking, history are displayed newest-first
  // (prepend order): reverse the ASC-by-createdAt query.
  const motionList: Motion[] = [];
  const motionSessionState: Record<string, MotionSessionState> = {};
  for (const row of [...motionRows].reverse()) {
    entityVersions.motions[row.id] = row.version;
    motionList.push(row.data);
    if (row.sessionState && Object.keys(row.sessionState).length > 0) {
      motionSessionState[row.id] = row.sessionState;
    }
  }

  const pointList = [...pointRows].reverse().map((row) => {
    entityVersions.points[row.id] = row.version;
    return row.data;
  });

  const historyList = [...historyRows].reverse().map((row) => row.data);
  const speakingList = [...speakingRows].reverse().map((row) => row.data);

  // Documents are displayed newest-first (prepend order).
  const documentList = [...documentRows].reverse().map((row) => {
    entityVersions.documents[row.id] = row.version;
    return row.data;
  });

  // Attendance: latest event per (session, delegate) wins.
  const sessionIds = sessionRows.map((s) => s.id);
  const attendanceBySession = new Map<string, Record<string, RollCallStatus>>();
  if (sessionIds.length > 0) {
    const events = await executor
      .select()
      .from(rollCallAttendanceEvents)
      .where(inArray(rollCallAttendanceEvents.sessionId, sessionIds))
      .orderBy(
        asc(rollCallAttendanceEvents.recordedAt),
        asc(rollCallAttendanceEvents.id)
      );
    for (const e of events) {
      const map = attendanceBySession.get(e.sessionId) ?? {};
      map[e.delegateId] = e.status as RollCallStatus;
      attendanceBySession.set(e.sessionId, map);
    }
  }

  const delegateCount = delegateList.length;
  const rollCalls = [...sessionRows].reverse().map((s) => {
    entityVersions.rollCallSessions[s.id] = s.version;
    const attendance = attendanceBySession.get(s.id) ?? {};
    const presentCount = Object.values(attendance).filter(isPresent).length;
    return {
      id: s.id,
      label: s.label,
      timestamp: s.timestamp,
      attendance,
      quorumMet: presentCount > delegateCount / 2,
    } satisfies RollCallSession;
  });

  return {
    delegates: delegateList,
    motions: motionList,
    motionSessionState,
    motionQueueHistory: historyList,
    rollCalls,
    points: pointList,
    speakingEvents: speakingList,
    documents: documentList,
    entityVersions,
  };
}
