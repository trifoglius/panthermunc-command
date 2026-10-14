import { v4 as uuidv4 } from "uuid";
import {
  applySpeakOrderReserve,
  getMotionTypeId,
  parseMinutes,
  parseSeconds,
} from "@/lib/motion-timers";
import {
  createEmptySessionState,
  deriveSessionPhase,
  ensureSessionState,
  proceduralMotionPasses,
} from "@/lib/session-state";
import type {
  ActiveCaucus,
  Amendment,
  Committee,
  CommitteeSessionState,
  DivisionPart,
  FloorAllotment,
  Motion,
  SpeakersListSnapshot,
  VoteContext,
  VoteMode,
} from "@/lib/types";

function withSession(
  committee: Committee,
  updater: (state: CommitteeSessionState) => CommitteeSessionState
): Committee {
  const current = ensureSessionState(committee.sessionState, committee.topic);
  const updated = updater(current);
  return {
    ...committee,
    sessionState: { ...updated, phase: deriveSessionPhase(updated) },
  };
}

export function patchSessionState(
  committee: Committee,
  patch: Partial<CommitteeSessionState>
): Committee {
  return withSession(committee, (s) => ({ ...s, ...patch }));
}

export function setAgendaAdopted(
  committee: Committee,
  adopted: boolean,
  topic?: string,
  adoptedAt?: string
): Committee {
  return withSession(committee, (s) => ({
    ...s,
    agenda: {
      topic: topic ?? (s.agenda.topic || committee.topic),
      adopted,
      adoptedAt: adopted ? adoptedAt ?? new Date().toISOString() : undefined,
    },
  }));
}

export function setSpeakingTime(
  committee: Committee,
  speakingSec: number
): Committee {
  if (!(speakingSec > 0)) return committee;
  return withSession(committee, (s) => ({
    ...s,
    speakingTime: { speakingSec },
  }));
}

/** @deprecated Prefer setSpeakingTime. */
export function setSpeakingTimes(
  committee: Committee,
  speakingSec?: number,
  _legacyBlocSec?: number
): Committee {
  if (speakingSec !== undefined && speakingSec > 0) {
    return setSpeakingTime(committee, speakingSec);
  }
  return committee;
}

export function setGeneralDebateQueue(
  committee: Committee,
  speakerQueue: string[],
  currentIndex = 0
): Committee {
  return withSession(committee, (s) => ({
    ...s,
    generalDebate: {
      ...s.generalDebate,
      speakerQueue,
      currentIndex: Math.max(0, Math.min(currentIndex, speakerQueue.length)),
    },
  }));
}

export function archiveAndClearSpeakersList(
  committee: Committee,
  snapshotId: string,
  savedAt: string
): Committee {
  const session = ensureSessionState(committee.sessionState, committee.topic);
  const queue = session.generalDebate.speakerQueue;
  if (queue.length === 0) return committee;

  const snapshot: SpeakersListSnapshot = {
    id: snapshotId,
    label: `Speakers list ${(committee.speakerListHistory?.length ?? 0) + 1}`,
    savedAt,
    speakerQueue: [...queue],
    currentIndex: session.generalDebate.currentIndex,
    speakingSec: session.speakingTime.speakingSec,
    agendaTopic: session.agenda.topic || committee.topic || undefined,
  };

  const cleared = withSession(committee, (s) => ({
    ...s,
    generalDebate: {
      ...s.generalDebate,
      speakerQueue: [],
      currentIndex: 0,
    },
    floorAllotment:
      s.floorAllotment?.kind === "general_debate"
        ? undefined
        : s.floorAllotment,
  }));

  return {
    ...cleared,
    speakerListHistory: [
      snapshot,
      ...(committee.speakerListHistory ?? []),
    ],
  };
}

export function setFloorAllotment(
  committee: Committee,
  floorAllotment: FloorAllotment | undefined
): Committee {
  return withSession(committee, (s) => ({
    ...s,
    floorAllotment,
  }));
}

export function clearFloorAllotment(committee: Committee): Committee {
  return setFloorAllotment(committee, undefined);
}

export function setAmendmentPeriod(
  committee: Committee,
  documentId: string,
  totalSec: number,
  active: boolean,
  endsAt?: string
): Committee {
  return withSession(committee, (s) => ({
    ...s,
    amendmentPeriod: {
      documentId,
      totalSec,
      active,
      endsAt: active ? endsAt : undefined,
    },
  }));
}

export function clearAmendmentPeriod(committee: Committee): Committee {
  return withSession(committee, (s) => ({
    ...s,
    amendmentPeriod: undefined,
  }));
}

export function setActiveCaucus(
  committee: Committee,
  activeCaucus: ActiveCaucus | undefined
): Committee {
  return withSession(committee, (s) => ({
    ...s,
    activeCaucus,
  }));
}

/** Full moderated-caucus speaker list for history: spoken + remaining. */
export function caucusSpeakerListForArchive(
  caucus: Pick<ActiveCaucus, "speakerQueue" | "completedSpeakers">
): string[] {
  return [...(caucus.completedSpeakers ?? []), ...caucus.speakerQueue];
}

function withCaucusSpeakerPersistence(
  committee: Committee,
  motionId: string,
  speakerQueue: string[]
): Committee {
  const prev = committee.motionSessionState?.[motionId] ?? {};
  return {
    ...committee,
    motionSessionState: {
      ...(committee.motionSessionState ?? {}),
      [motionId]: {
        ...prev,
        speakerQueue: speakerQueue.length > 0 ? speakerQueue : undefined,
      },
    },
  };
}

export function setCaucusSpeakerQueue(
  committee: Committee,
  queue: string[]
): Committee {
  const withSessionState = withSession(committee, (s) => {
    if (!s.activeCaucus) return s;
    return {
      ...s,
      activeCaucus: { ...s.activeCaucus, speakerQueue: queue },
    };
  });
  const caucus = withSessionState.sessionState?.activeCaucus;
  if (!caucus) return withSessionState;
  return withCaucusSpeakerPersistence(
    withSessionState,
    caucus.motionId,
    caucusSpeakerListForArchive(caucus)
  );
}

/** Move the current (first) caucus speaker to completed and keep the rest. */
export function advanceCaucusSpeaker(committee: Committee): Committee {
  const withSessionState = withSession(committee, (s) => {
    if (!s.activeCaucus || s.activeCaucus.speakerQueue.length === 0) return s;
    const [spoken, ...rest] = s.activeCaucus.speakerQueue;
    return {
      ...s,
      activeCaucus: {
        ...s.activeCaucus,
        completedSpeakers: [
          ...(s.activeCaucus.completedSpeakers ?? []),
          spoken,
        ],
        speakerQueue: rest,
      },
    };
  });
  const caucus = withSessionState.sessionState?.activeCaucus;
  if (!caucus) return withSessionState;
  return withCaucusSpeakerPersistence(
    withSessionState,
    caucus.motionId,
    caucusSpeakerListForArchive(caucus)
  );
}

export function setCaucusSpeakOrder(
  committee: Committee,
  speakOrder: "first" | "last" | undefined
): Committee {
  const withSessionState = withSession(committee, (s) => {
    if (!s.activeCaucus) return s;
    const caucus = s.activeCaucus;
    const speakerQueue = applySpeakOrderReserve(
      caucus.speakerQueue,
      caucus.proposedBy,
      speakOrder,
      0
    );
    return {
      ...s,
      activeCaucus: {
        ...caucus,
        speakOrder,
        speakerQueue,
      },
    };
  });
  const caucus = withSessionState.sessionState?.activeCaucus;
  if (!caucus) return withSessionState;
  return withCaucusSpeakerPersistence(
    withSessionState,
    caucus.motionId,
    caucusSpeakerListForArchive(caucus)
  );
}

/** End caucus, persisting the full speaker list onto the motion for later archive. */
export function clearActiveCaucus(committee: Committee): Committee {
  const session = ensureSessionState(committee.sessionState, committee.topic);
  const caucus = session.activeCaucus;
  if (!caucus) return committee;
  const persisted = withCaucusSpeakerPersistence(
    committee,
    caucus.motionId,
    caucusSpeakerListForArchive(caucus)
  );
  return setActiveCaucus(persisted, undefined);
}

/** Rebuild an active moderated caucus from a passed motion (e.g. after End caucus). */
export function startModeratedCaucusFromMotion(
  committee: Committee,
  motion: Motion
): Committee {
  if (getMotionTypeId(motion) !== "moderated_caucus") return committee;
  const d = motion.details;
  const saved =
    committee.motionSessionState?.[motion.id]?.speakerQueue ?? [];
  return setActiveCaucus(committee, {
    motionId: motion.id,
    topic: d.topic ?? "",
    totalSec: parseMinutes(d.duration),
    speakingSec: parseSeconds(d.speaking_time),
    // Restore remaining queue from saved list when reopening; treat all as remaining.
    speakerQueue: [...saved],
    completedSpeakers: [],
    proposedBy: motion.proposedBy,
    startedAt: new Date().toISOString(),
  });
}

export function setSuspension(
  committee: Committee,
  durationSec: number,
  active: boolean,
  endsAt?: string
): Committee {
  return withSession(committee, (s) => ({
    ...s,
    suspension: active
      ? { durationSec, active: true, endsAt }
      : undefined,
  }));
}

export function clearSuspension(committee: Committee): Committee {
  return withSession(committee, (s) => ({
    ...s,
    suspension: undefined,
  }));
}

export function openVoteContext(
  committee: Committee,
  voteContext: VoteContext
): Committee {
  return withSession(committee, (s) => ({
    ...s,
    voteContext,
  }));
}

export function patchVoteContext(
  committee: Committee,
  patch: Partial<VoteContext>
): Committee {
  return withSession(committee, (s) => {
    if (!s.voteContext) return s;
    return {
      ...s,
      voteContext: { ...s.voteContext, ...patch },
    };
  });
}

export function clearVoteContext(committee: Committee): Committee {
  return withSession(committee, (s) => ({
    ...s,
    voteContext: undefined,
  }));
}

export function setOpenAppeal(
  committee: Committee,
  openAppeal: CommitteeSessionState["openAppeal"]
): Committee {
  return withSession(committee, (s) => ({ ...s, openAppeal }));
}

/** Apply session-side effects when a motion status becomes passed. */
export function applyPassedMotionEffects(
  committee: Committee,
  motion: Motion
): Committee {
  const typeId = getMotionTypeId(motion);
  if (!typeId) return committee;
  const d = motion.details;
  let next = committee;

  switch (typeId) {
    case "moderated_caucus": {
      // Speaker list + first/last reserve are set after the motion passes.
      next = setActiveCaucus(next, {
        motionId: motion.id,
        topic: d.topic ?? "",
        totalSec: parseMinutes(d.duration),
        speakingSec: parseSeconds(d.speaking_time),
        speakerQueue: [],
        completedSpeakers: [],
        proposedBy: motion.proposedBy,
        startedAt: new Date().toISOString(),
      });
      break;
    }
    case "suspend_meeting": {
      const durationSec = parseMinutes(d.duration);
      const endsAt =
        durationSec > 0
          ? new Date(Date.now() + durationSec * 1000).toISOString()
          : undefined;
      next = setSuspension(next, durationSec, true, endsAt);
      break;
    }
    case "change_speaking_time": {
      const seconds =
        parseSeconds(d.speaking_time) || parseSeconds(d.new_time);
      if (seconds > 0) {
        next = setSpeakingTime(next, seconds);
        // Keep an open floor timer aligned with the new limit.
        next = withSession(next, (s) => {
          const floor = s.floorAllotment;
          if (!floor || floor.kind !== "general_debate") return s;
          return {
            ...s,
            floorAllotment: { ...floor, allottedSec: seconds },
          };
        });
      }
      break;
    }
    // Division and competence: 2-for-2 + motion vote run in Voting via
    // beginProceduralMotionVote — not as a side effect of marking passed.
    default:
      break;
  }

  return next;
}

/**
 * Open the Voting-tab procedure for division or competence:
 * speakers for/against the motion, then the motion vote — before any proposal
 * or divided-part vote / EOVs on the item.
 */
export function beginProceduralMotionVote(
  committee: Committee,
  motion: Motion
): Committee {
  const typeId = getMotionTypeId(motion);
  if (typeId !== "division_question" && typeId !== "competence") {
    return committee;
  }
  const d = motion.details;
  const documentId = d.document_id || d.target || "";

  if (typeId === "division_question") {
    const partsRaw = d.parts ?? "";
    const parts: DivisionPart[] = partsRaw
      .split(/[;\n]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((label) => ({
        id: uuidv4(),
        label,
        status: "pending" as const,
      }));
    return openVoteContext(committee, {
      target: {
        type: "division",
        id: motion.id,
        parentDocumentId: documentId,
      },
      mode: "recorded",
      eov: {
        beforeOpen: false,
        afterOpen: false,
        beforeSpeakers: [],
        afterSpeakers: [],
      },
      speakersFor: [],
      speakersAgainst: [],
      division: {
        parts,
        wholeStatus: "pending",
      },
      tallies: { yes: 0, no: 0, abstain: 0 },
      recordedVotes: {},
    });
  }

  return openVoteContext(committee, {
    target: {
      type: "competence",
      id: motion.id,
      parentDocumentId: documentId,
    },
    mode: "recorded",
    eov: {
      beforeOpen: false,
      afterOpen: false,
      beforeSpeakers: [],
      afterSpeakers: [],
    },
    speakersFor: [],
    speakersAgainst: [],
    competence: {
      motionId: motion.id,
      status: "pending",
      documentId,
    },
    tallies: { yes: 0, no: 0, abstain: 0 },
    recordedVotes: {},
  });
}

export function createDefaultVoteContext(
  documentId: string,
  mode: VoteMode = "recorded"
): VoteContext {
  return {
    target: { type: "document", id: documentId },
    mode,
    eov: {
      beforeOpen: false,
      afterOpen: false,
      beforeSpeakers: [],
      afterSpeakers: [],
    },
    tallies: { yes: 0, no: 0, abstain: 0 },
    recordedVotes: {},
  };
}

export function addAmendmentToDocument(
  committee: Committee,
  documentId: string,
  amendment: Amendment
): Committee {
  return {
    ...committee,
    documents: committee.documents.map((doc) =>
      doc.id === documentId
        ? { ...doc, amendments: [...doc.amendments, amendment] }
        : doc
    ),
  };
}

export function updateAmendmentOnDocument(
  committee: Committee,
  documentId: string,
  amendment: Amendment
): Committee {
  return {
    ...committee,
    documents: committee.documents.map((doc) =>
      doc.id === documentId
        ? {
            ...doc,
            amendments: doc.amendments.map((a) =>
              a.id === amendment.id ? amendment : a
            ),
          }
        : doc
    ),
  };
}

export function ensureCommitteeSession(committee: Committee): Committee {
  if (committee.sessionState) {
    return {
      ...committee,
      sessionState: ensureSessionState(committee.sessionState, committee.topic),
    };
  }
  return {
    ...committee,
    sessionState: createEmptySessionState(committee.topic),
  };
}

export { proceduralMotionPasses };
