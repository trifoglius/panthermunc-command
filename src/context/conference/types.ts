import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import type {
  Committee,
  CommitteeType,
  Conference,
  Delegate,
  Document,
  Motion,
  Point,
  PositionPaperStatus,
  PaperVoteRecord,
  RollCallStatus,
  ScorerRole,
  SpeakingEvent,
} from "@/lib/types";

export interface ConferenceContextValue {
  conference: Conference | null;
  activeCommittee: Committee | null;
  loading: boolean;
  conferenceUnavailable: boolean;
  syncError: string | null;
  clearSyncError: () => void;
  initConference: (name: string, year: number) => Promise<void>;
  updateConference: (updates: { name?: string; year?: number }) => Promise<void>;
  removeCommittee: (id: string) => Promise<void>;
  deleteConference: () => Promise<void>;
  createCommittee: (
    name: string,
    type: CommitteeType,
    topic: string,
    withDefaults?: boolean
  ) => Promise<string>;
  selectCommittee: (id: string | null) => Promise<void>;
  loadAllCommitteeData: () => Promise<void>;
  updateCommittee: (committee: Committee) => void;
  updateCommitteeSettings: (
    committeeId: string,
    updates: { name?: string; topic?: string; type?: CommitteeType }
  ) => Promise<void>;
  addDelegate: (
    country: string,
    delegateName: string,
    ppStatus?: PositionPaperStatus
  ) => void;
  updateDelegate: (delegate: Delegate) => void;
  removeDelegate: (id: string) => void;
  startRollCall: (label: string) => string;
  updateRollCallStatus: (
    sessionId: string,
    delegateId: string,
    status: RollCallStatus
  ) => void;
  addMotion: (motion: Omit<Motion, "id" | "timestamp">) => void;
  updateMotion: (motion: Motion) => void;
  setMotionSpeakerQueue: (motionId: string, queue: string[]) => void;
  setMotionVotingSpeakers: (
    motionId: string,
    speakersFor: string[],
    speakersAgainst: string[]
  ) => void;
  setMotionPaperVotes: (motionId: string, paperVotes: PaperVoteRecord[]) => void;
  setMotionPresentationDelegates: (
    motionId: string,
    presentationDelegates: string[],
    qaDelegates: string[]
  ) => void;
  archiveMotionQueue: (passedMotionId: string) => void;
  addDocument: (doc: Omit<Document, "id" | "amendments">) => void;
  updateDocument: (doc: Document) => void;
  promoteToDraftResolution: (workingPaperId: string) => void;
  addSpeakingEvent: (event: Omit<SpeakingEvent, "id" | "timestamp">) => void;
  addPoint: (point: Omit<Point, "id" | "timestamp" | "resolved">) => void;
  resolvePoint: (id: string) => void;
  updateRubricScore: (
    role: ScorerRole,
    delegateId: string,
    scores: Record<string, number>,
    notes?: string
  ) => void;
  signScores: (role: ScorerRole) => void;
  updatePositionPaperScore: (
    delegateId: string,
    score: number,
    notes?: string
  ) => void;
  setVcRecipient: (delegateId: string | undefined) => void;
}

export interface CommitteeSyncEngine {
  conference: Conference | null;
  activeCommittee: Committee | null;
  activeCommitteeId: string | null;
  loading: boolean;
  conferenceUnavailable: boolean;
  syncError: string | null;
  conferenceRef: MutableRefObject<Conference | null>;
  versions: MutableRefObject<Map<string, number>>;
  setConference: Dispatch<SetStateAction<Conference | null>>;
  setActiveCommitteeId: Dispatch<SetStateAction<string | null>>;
  setSyncError: Dispatch<SetStateAction<string | null>>;
  clearSyncError: () => void;
  loadCommitteeData: (id: string, ifVersion?: number) => Promise<void>;
  loadAllCommitteeData: () => Promise<void>;
  patchCommittee: (
    committeeId: string,
    updater: (c: Committee) => Committee
  ) => void;
  requireCommittee: () => string;
}
