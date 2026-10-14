import type { Committee, CommitteeType } from "@/lib/types";
import type { CommitteeData } from "@/db/schema";
import { createEmptySessionState, ensureSessionState } from "@/lib/session-state";

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
    speakerListHistory: c.speakerListHistory ?? [],
    motionSessionState: c.motionSessionState ?? {},
    sessionState: ensureSessionState(c.sessionState, c.topic),
    documents: c.documents,
    speakingEvents: c.speakingEvents,
    points: c.points,
    requirePositionPapers: c.requirePositionPapers,
    nextDraftSubmissionOrder: c.nextDraftSubmissionOrder,
  };
}

export function rowToCommittee(row: DbCommitteeRow): Committee {
  const data = row.data;
  return {
    id: row.id,
    name: row.name,
    type: row.type as CommitteeType,
    topic: row.topic,
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : row.createdAt.toISOString(),
    delegates: data.delegates ?? [],
    rollCalls: data.rollCalls ?? [],
    motions: data.motions ?? [],
    motionQueueHistory: data.motionQueueHistory ?? [],
    speakerListHistory: data.speakerListHistory ?? [],
    motionSessionState: data.motionSessionState ?? {},
    sessionState: ensureSessionState(data.sessionState, row.topic),
    documents: data.documents ?? [],
    speakingEvents: data.speakingEvents ?? [],
    points: data.points ?? [],
    requirePositionPapers: data.requirePositionPapers ?? false,
    nextDraftSubmissionOrder: data.nextDraftSubmissionOrder,
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
    speakerListHistory: [],
    motionSessionState: {},
    sessionState: createEmptySessionState(row.topic),
    documents: [],
    speakingEvents: [],
    points: [],
    requirePositionPapers: false,
  };
}

/** All top-level keys of CommitteeData for dirty-tracking purposes. */
export const COMMITTEE_DATA_KEYS: ReadonlyArray<keyof CommitteeData> = [
  "delegates",
  "rollCalls",
  "motions",
  "motionQueueHistory",
  "speakerListHistory",
  "motionSessionState",
  "sessionState",
  "documents",
  "speakingEvents",
  "points",
  "requirePositionPapers",
  "nextDraftSubmissionOrder",
];
