export type CommitteeType = "ga" | "crisis" | "specialized";
export type PositionPaperStatus = "epp" | "lpp" | "none";
export type RollCallStatus = "present" | "present_voting" | "absent";
export type MotionStatus = "pending" | "passed" | "failed" | "withdrawn";
export type DocumentType = "working_paper" | "draft_resolution";
export type DocumentStatus =
  | "draft"
  | "submitted"
  | "presented"
  | "adopted"
  | "failed";
export type PointType = "order" | "privilege" | "inquiry";
export type ScorerRole = "judge" | "dais";

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
  disruptivity: number;
  details: Record<string, string>;
  votesFor?: number;
  votesAgainst?: number;
  votesAbstain?: number;
  notes?: string;
}

export interface Amendment {
  id: string;
  clause: string;
  language: string;
  amendmentType: "friendly" | "unfriendly";
  status: "pending" | "incorporated" | "failed";
  proposedBy: string;
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  sponsors: string[];
  signatories: string[];
  authorPanel: string[];
  content: string;
  link?: string;
  amendments: Amendment[];
  submittedAt?: string;
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
}

export interface RubricScore {
  delegateId: string;
  scores: Record<string, number>;
  total: number;
  notes: string;
  signed: boolean;
  signedAt?: string;
}

export interface PositionPaperScore {
  delegateId: string;
  score: number;
  notes: string;
}

export interface MotionSessionState {
  speakerQueue?: string[];
  speakersFor?: string[];
  speakersAgainst?: string[];
}

export interface MotionQueueSnapshot {
  id: string;
  label: string;
  savedAt: string;
  passedMotion: Motion | null;
  motions: Motion[];
  speakerQueue?: string[];
  votingSpeakers?: { for: string[]; against: string[] };
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
  motionSessionState?: Record<string, MotionSessionState>;
  documents: Document[];
  speakingEvents: SpeakingEvent[];
  points: Point[];
  judgeScores: RubricScore[];
  daisScores: RubricScore[];
  positionPaperScores: PositionPaperScore[];
  vcRecipientId?: string;
  discrepancyThreshold: number;
  requirePositionPapers: boolean;
  createdAt: string;
}

export interface Conference {
  id: string;
  name: string;
  year: number;
  managementPasswordHash?: string;
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
  judgeScore?: number;
  daisScore?: number;
  compositeScore?: number;
  absoluteDifference?: number;
  rank?: number;
  positionPaperScore?: number;
  positionPaperStatus: PositionPaperStatus;
  specialCircumstance?: "discrepancy" | "tie" | "both";
}
