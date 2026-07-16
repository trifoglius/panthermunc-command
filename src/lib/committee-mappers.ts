import type { Committee, CommitteeType } from "@/lib/types";
import type { CommitteeData } from "@/db/schema";

export type DbCommitteeRow = {
  id: string;
  name: string;
  type: string;
  topic: string;
  data: CommitteeData;
  createdAt: string | Date;
  version: number;
};

export function committeeToData(c: Committee): CommitteeData {
  return {
    delegates: c.delegates,
    rollCalls: c.rollCalls,
    motions: c.motions,
    motionQueueHistory: c.motionQueueHistory ?? [],
    motionSessionState: c.motionSessionState ?? {},
    documents: c.documents,
    speakingEvents: c.speakingEvents,
    points: c.points,
    judgeScores: c.judgeScores,
    daisScores: c.daisScores,
    positionPaperScores: c.positionPaperScores,
    vcRecipientId: c.vcRecipientId,
    discrepancyThreshold: c.discrepancyThreshold,
    requirePositionPapers: c.requirePositionPapers,
    nextDraftSubmissionOrder: c.nextDraftSubmissionOrder ?? 0,
  };
}

export function rowToCommittee(row: DbCommitteeRow): Committee {
  return {
    id: row.id,
    name: row.name,
    type: row.type as CommitteeType,
    topic: row.topic,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : row.createdAt.toISOString(),
    ...row.data,
  };
}

export function emptyCommitteeStub(row: {
  id: string;
  name: string;
  type: string;
  topic: string;
  createdAt: string | Date;
}): Committee {
  return {
    id: row.id,
    name: row.name,
    type: row.type as CommitteeType,
    topic: row.topic,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : (row.createdAt as Date).toISOString(),
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

/** All top-level keys of CommitteeData for dirty-tracking purposes. */
export const COMMITTEE_DATA_KEYS: ReadonlyArray<keyof CommitteeData> = [
  "delegates",
  "rollCalls",
  "motions",
  "motionQueueHistory",
  "motionSessionState",
  "documents",
  "speakingEvents",
  "points",
  "judgeScores",
  "daisScores",
  "positionPaperScores",
  "vcRecipientId",
  "discrepancyThreshold",
  "requirePositionPapers",
  // NOTE: nextDraftSubmissionOrder is intentionally excluded — it is a
  // server-assigned atomic counter (Phase 4), never written from the client.
];
