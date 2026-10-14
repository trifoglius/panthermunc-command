export type CommitteeType = "ga" | "crisis" | "specialized";
export type PositionPaperStatus = "epp" | "lpp" | "none";
/** Legacy `present_voting` kept for old roll-call data; new UI uses present | absent only. */
export type RollCallStatus = "present" | "present_voting" | "absent";
export type MotionStatus = "pending" | "passed" | "failed" | "withdrawn";
export type DocumentType = "working_paper" | "draft_resolution" | "resolution";
export type DocumentStatus =
  | "draft"
  | "submitted"
  | "presented"
  | "adopted"
  | "failed"
  | "withdrawn";
/** Legacy privilege/inquiry kept for old point logs; new UI uses order only. */
export type PointType = "order" | "privilege" | "inquiry";
/** @deprecated Legacy national/bloc capacity; no longer used. */
export type SpeakingCapacity = "national" | "bloc";
export type SessionPhaseHint =
  | "idle"
  | "debate"
  | "caucus"
  | "amendment_period"
  | "voting"
  | "suspended"
  | "adjourned";
/** `placard` kept for older session JSON; treat as recorded. */
export type VoteMode = "consensus" | "recorded" | "placard";
export type FloorAllotmentKind =
  | "draft_intro"
  | "amendment_intro"
  | "eov_before"
  | "eov_after"
  | "general_debate"
  | "moderated_caucus"
  | "other";
export type AppealStatus = "none" | "pending" | "sustained" | "overruled";
export type DivisionPartStatus = "pending" | "approved" | "rejected";
export type CompetenceStatus = "pending" | "competent" | "not_competent";

export interface Delegate {
  id: string;
  country: string;
  delegateName: string;
  positionPaperStatus: PositionPaperStatus;
}

export interface RollCallSession {
  id: string;
  label: string;
  timestamp: string;
  attendance: Record<string, RollCallStatus>;
  quorumMet: boolean;
}

export interface Motion {
  id: string;
  motionTypeId?: string;
  type: string;
  proposedBy: string;
  timestamp: string;
  status: MotionStatus;
  /** Legacy field; unused (defaults to 0). */
  disruptivity: number;
  details: Record<string, string>;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
  notes?: string;
}

export interface Amendment {
  id: string;
  title?: string;
  /** Change clauses / operatives (list supports division of the question). */
  clauses?: string[];
  /** @deprecated Prefer `clauses`. Kept for older saved sessions. */
  clause?: string;
  /** @deprecated Prefer amendment `link`; kept for older saved sessions. */
  language?: string;
  link?: string;
  amendmentType: "friendly" | "unfriendly";
  status:
    | "pending"
    | "submitted"
    | "presented"
    | "incorporated"
    | "failed"
    | "withdrawn";
  proposedBy: string;
  sponsors?: string[];
  submittedAt?: string;
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  sponsors: string[];
  /** Legacy; unused. */
  signatories: string[];
  /** Legacy; unused. */
  authorPanel: string[];
  content: string;
  link?: string;
  amendments: Amendment[];
  submittedAt?: string;
  submissionNumber?: number;
  sourceWorkingPaperId?: string;
}

export interface SpeakingEvent {
  id: string;
  delegateId: string;
  eventType: string;
  durationSeconds?: number;
  timestamp: string;
  notes?: string;
}

export interface Point {
  id: string;
  type: PointType;
  delegateId: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  chairRuling?: string;
  appealStatus?: AppealStatus;
  appealVotesFor?: number;
  appealVotesAgainst?: number;
  appealVotesAbstain?: number;
}

export type DelegatePaperVote = "yes" | "no" | "abstain";

export interface MotionSessionState {
  speakerQueue?: string[];
  speakersFor?: string[];
  speakersAgainst?: string[];
  paperVotes?: PaperVoteRecord[];
  /** documentId → delegateId → vote */
  rollCallVotes?: Record<string, Record<string, DelegatePaperVote>>;
  presentationDelegates?: string[];
  qaDelegates?: string[];
}

export interface PaperVoteRecord {
  documentId: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
}

export interface MotionQueueSnapshot {
  id: string;
  label: string;
  savedAt: string;
  passedMotion: Motion | null;
  motions: Motion[];
  speakerQueue?: string[];
  votingSpeakers?: { for: string[]; against: string[] };
  presentationDelegates?: string[];
  qaDelegates?: string[];
}

export interface VoteTarget {
  type:
    | "document"
    | "amendment"
    | "motion"
    | "appeal"
    | "competence"
    /** Vote on the motion to divide, before part votes. */
    | "division"
    | "division_part"
    | "division_whole";
  id: string;
  parentDocumentId?: string;
  partLabel?: string;
}

export interface DivisionPart {
  id: string;
  label: string;
  status: DivisionPartStatus;
}

export interface VoteContext {
  target: VoteTarget;
  mode: VoteMode;
  eov: {
    beforeOpen: boolean;
    afterOpen: boolean;
    beforeSpeakers: string[];
    afterSpeakers: string[];
    timeLimitSec?: number;
  };
  speakersFor?: string[];
  speakersAgainst?: string[];
  division?: {
    parts: DivisionPart[];
    wholeStatus?: DivisionPartStatus;
  };
  competence?: {
    motionId?: string;
    status: CompetenceStatus;
    documentId: string;
  };
  tallies?: { yes: number; no: number; abstain: number };
  recordedVotes?: Record<string, DelegatePaperVote>;
  votingStarted?: boolean;
  resultApplied?: boolean;
}

export interface FloorAllotment {
  kind: FloorAllotmentKind;
  documentId?: string;
  amendmentId?: string;
  delegateId: string;
  allottedSec: number;
  startedAt?: string;
  /** @deprecated Legacy field from national/bloc era. */
  capacity?: SpeakingCapacity;
}

export interface SpeakersListSnapshot {
  id: string;
  label: string;
  savedAt: string;
  speakerQueue: string[];
  currentIndex: number;
  speakingSec?: number;
  agendaTopic?: string;
}

export interface ActiveCaucus {
  motionId: string;
  topic: string;
  totalSec: number;
  speakingSec: number;
  /** Remaining speakers, in order. */
  speakerQueue: string[];
  /** Speakers who already spoke (advanced off the queue), in order. */
  completedSpeakers?: string[];
  proposedBy: string;
  speakOrder?: "first" | "last";
  startedAt?: string;
}

export interface CommitteeSessionState {
  phase: SessionPhaseHint;
  agenda: {
    topic: string;
    adopted: boolean;
    adoptedAt?: string;
  };
  speakingTime: {
    speakingSec: number;
  };
  generalDebate: {
    open: boolean;
    speakerQueue: string[];
    currentIndex: number;
  };
  floorAllotment?: FloorAllotment;
  amendmentPeriod?: {
    documentId: string;
    totalSec: number;
    endsAt?: string;
    active: boolean;
  };
  voteContext?: VoteContext;
  activeCaucus?: ActiveCaucus;
  suspension?: {
    durationSec: number;
    endsAt?: string;
    active: boolean;
  };
  openAppeal?: {
    pointId: string;
    chairRuling: string;
    status: "pending" | "sustained" | "overruled";
    votes?: { yes: number; no: number; abstain: number };
  };
}

export interface Committee {
  id: string;
  name: string;
  type: CommitteeType;
  topic: string;
  delegates: Delegate[];
  rollCalls: RollCallSession[];
  motions: Motion[];
  motionQueueHistory?: MotionQueueSnapshot[];
  /** Archived general speakers lists (cleared lists saved for the record). */
  speakerListHistory?: SpeakersListSnapshot[];
  /** Legacy per-motion session bags; retained for history/export of old data. */
  motionSessionState?: Record<string, MotionSessionState>;
  sessionState?: CommitteeSessionState;
  documents: Document[];
  speakingEvents: SpeakingEvent[];
  points: Point[];
  requirePositionPapers: boolean;
  nextDraftSubmissionOrder?: number;
  createdAt: string;
}

export interface Conference {
  id: string;
  name: string;
  year: number;
  committees: Committee[];
  createdAt: string;
  updatedAt: string;
}

export interface DelegateStats {
  delegateId: string;
  country: string;
  delegateName: string;
  speeches: number;
  totalSpeakingSeconds: number;
  motionsProposed: number;
  documentsSponsored: number;
  documentsSigned: number;
  pointsRaised: number;
  positionPaperStatus: PositionPaperStatus;
}

export interface NotificationItem {
  id: string;
  message: string;
  committeeIds: string[] | null;
  createdAt: string;
  createdBy: string;
}
