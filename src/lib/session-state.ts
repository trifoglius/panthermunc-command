import type {
  CommitteeSessionState,
  SessionPhaseHint,
  VoteMode,
  VoteTarget,
} from "./types";

export const DEFAULT_SPEAKING_SEC = 90;

function normalizeSpeakingTime(
  raw: CommitteeSessionState["speakingTime"] | Record<string, number> | undefined
): { speakingSec: number } {
  if (!raw || typeof raw !== "object") {
    return { speakingSec: DEFAULT_SPEAKING_SEC };
  }
  const record = raw as Record<string, number>;
  if (typeof record.speakingSec === "number" && record.speakingSec > 0) {
    return { speakingSec: record.speakingSec };
  }
  // Legacy national/bloc — prefer national, then bloc
  if (typeof record.nationalSec === "number" && record.nationalSec > 0) {
    return { speakingSec: record.nationalSec };
  }
  if (typeof record.blocSec === "number" && record.blocSec > 0) {
    return { speakingSec: record.blocSec };
  }
  return { speakingSec: DEFAULT_SPEAKING_SEC };
}

export function createEmptySessionState(
  topic = ""
): CommitteeSessionState {
  return {
    phase: "idle",
    agenda: {
      topic,
      adopted: false,
    },
    speakingTime: {
      speakingSec: DEFAULT_SPEAKING_SEC,
    },
    generalDebate: {
      open: true,
      speakerQueue: [],
      currentIndex: 0,
    },
  };
}

/** Normalize missing/partial sessionState from older committee JSON. */
export function ensureSessionState(
  state: CommitteeSessionState | undefined | null,
  topic = ""
): CommitteeSessionState {
  const base = createEmptySessionState(topic);
  if (!state) return base;
  const merged: CommitteeSessionState = {
    ...base,
    ...state,
    agenda: { ...base.agenda, ...state.agenda },
    speakingTime: normalizeSpeakingTime(
      (state.speakingTime as CommitteeSessionState["speakingTime"]) ??
        base.speakingTime
    ),
    generalDebate: {
      ...base.generalDebate,
      open: state.generalDebate?.open ?? base.generalDebate.open,
      speakerQueue:
        state.generalDebate?.speakerQueue ?? base.generalDebate.speakerQueue,
      currentIndex:
        state.generalDebate?.currentIndex ?? base.generalDebate.currentIndex,
    },
  };
  return { ...merged, phase: deriveSessionPhase(merged) };
}

/**
 * Derive the session phase from authoritative session fields.
 * Avoids stale manual phase writes (e.g. clearing a vote while suspended).
 */
export function deriveSessionPhase(
  state: CommitteeSessionState
): SessionPhaseHint {
  if (state.suspension?.active) return "suspended";
  if (state.voteContext) return "voting";
  if (state.amendmentPeriod?.active) return "amendment_period";
  if (state.activeCaucus) return "caucus";
  if (state.phase === "adjourned") return "adjourned";
  if (
    state.agenda.adopted ||
    state.floorAllotment ||
    state.generalDebate.speakerQueue.length > 0
  ) {
    return "debate";
  }
  return "idle";
}

export function speakingSeconds(state: CommitteeSessionState): number {
  return state.speakingTime.speakingSec;
}

/** @deprecated Use speakingSeconds. */
export function speakingSecondsForCapacity(
  state: CommitteeSessionState,
  _capacity?: string
): number {
  return speakingSeconds(state);
}

export function proceduralMotionPasses(
  votesFor: number,
  votesAgainst: number
): boolean {
  const cast = votesFor + votesAgainst;
  if (cast === 0) return false;
  return votesFor > votesAgainst;
}

export function createVoteTarget(
  type: VoteTarget["type"],
  id: string,
  extras?: Partial<Pick<VoteTarget, "parentDocumentId" | "partLabel">>
): VoteTarget {
  return { type, id, ...extras };
}

export function defaultVoteMode(): VoteMode {
  return "recorded";
}

/** Normalize legacy `placard` mode to recorded (placard-raising is a recorded vote). */
export function normalizeVoteMode(mode: VoteMode | undefined): "consensus" | "recorded" {
  if (mode === "consensus") return "consensus";
  return "recorded";
}
