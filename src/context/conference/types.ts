import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import type {
  Amendment,
  Committee,
  CommitteeType,
  Conference,
  Delegate,
  Document,
  FloorAllotment,
  Motion,
  Point,
  PositionPaperStatus,
  RollCallStatus,
  SpeakingEvent,
  VoteContext,
  VoteMode,
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
  /** Open Voting procedure for division / competence (2-for-2 then motion vote). */
  beginProceduralMotionVote: (motion: Motion) => void;
  archiveMotionQueue: (passedMotionId: string) => void;
  addDocument: (doc: Omit<Document, "id" | "amendments">) => void;
  updateDocument: (doc: Document) => void;
  promoteToDraftResolution: (workingPaperId: string) => void;
  addAmendment: (documentId: string, amendment: Omit<Amendment, "id">) => void;
  updateAmendment: (documentId: string, amendment: Amendment) => void;
  addSponsor: (
    documentId: string,
    delegateId: string,
    amendmentId?: string
  ) => void;
  addSpeakingEvent: (event: Omit<SpeakingEvent, "id" | "timestamp">) => void;
  addPoint: (point: Omit<Point, "id" | "timestamp" | "resolved">) => void;
  resolvePoint: (id: string) => void;
  setPointRuling: (pointId: string, chairRuling: string) => void;
  startAppeal: (pointId: string, chairRuling: string) => void;
  resolveAppeal: (
    pointId: string,
    votesFor: number,
    votesAgainst: number,
    votesAbstain?: number
  ) => void;
  setAgendaAdopted: (adopted: boolean, topic?: string) => void;
  setSpeakingTime: (speakingSec: number) => void;
  setGeneralDebateQueue: (
    speakerQueue: string[],
    currentIndex?: number
  ) => void;
  archiveAndClearSpeakersList: () => void;
  setFloorAllotment: (floorAllotment: FloorAllotment | undefined) => void;
  setAmendmentPeriod: (
    documentId: string,
    totalSec: number,
    active: boolean,
    endsAt?: string
  ) => void;
  clearAmendmentPeriod: () => void;
  setCaucusSpeakerQueue: (queue: string[]) => void;
  advanceCaucusSpeaker: () => void;
  setCaucusSpeakOrder: (speakOrder: "first" | "last" | undefined) => void;
  startModeratedCaucus: (motion: Motion) => void;
  clearActiveCaucus: () => void;
  clearSuspension: () => void;
  openVote: (documentId: string, mode?: VoteMode) => void;
  openAmendmentVote: (
    documentId: string,
    amendmentId: string,
    mode?: VoteMode
  ) => void;
  patchVoteContext: (patch: Partial<VoteContext>) => void;
  clearVoteContext: () => void;
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
