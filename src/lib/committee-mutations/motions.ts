import {
  isFormalSpeakingMotion,
  getMotionTypeId,
  isAffirmative,
} from "@/lib/motion-timers";
import type {
  Committee,
  Motion,
  MotionQueueSnapshot,
  PaperVoteRecord,
} from "@/lib/types";

export function addMotion(committee: Committee, motion: Motion): Committee {
  return { ...committee, motions: [motion, ...committee.motions] };
}

export function updateMotion(committee: Committee, motion: Motion): Committee {
  return {
    ...committee,
    motions: committee.motions.map((m) => (m.id === motion.id ? motion : m)),
  };
}

export function setMotionSpeakerQueue(
  committee: Committee,
  motionId: string,
  queue: string[]
): Committee {
  return {
    ...committee,
    motionSessionState: {
      ...(committee.motionSessionState ?? {}),
      [motionId]: {
        ...(committee.motionSessionState?.[motionId] ?? {}),
        speakerQueue: queue,
      },
    },
  };
}

export function setMotionVotingSpeakers(
  committee: Committee,
  motionId: string,
  speakersFor: string[],
  speakersAgainst: string[]
): Committee {
  return {
    ...committee,
    motionSessionState: {
      ...(committee.motionSessionState ?? {}),
      [motionId]: {
        ...(committee.motionSessionState?.[motionId] ?? {}),
        speakersFor,
        speakersAgainst,
      },
    },
  };
}

export function setMotionPaperVotes(
  committee: Committee,
  motionId: string,
  paperVotes: PaperVoteRecord[]
): Committee {
  return {
    ...committee,
    motionSessionState: {
      ...(committee.motionSessionState ?? {}),
      [motionId]: {
        ...(committee.motionSessionState?.[motionId] ?? {}),
        paperVotes,
      },
    },
  };
}

export function setMotionPresentationDelegates(
  committee: Committee,
  motionId: string,
  presentationDelegates: string[],
  qaDelegates: string[]
): Committee {
  return {
    ...committee,
    motionSessionState: {
      ...(committee.motionSessionState ?? {}),
      [motionId]: {
        ...(committee.motionSessionState?.[motionId] ?? {}),
        presentationDelegates,
        qaDelegates,
      },
    },
  };
}

export function archiveMotionQueue(
  committee: Committee,
  passedMotionId: string,
  snapshotId: string,
  savedAt: string
): Committee {
  const passedMotion =
    committee.motions.find((m) => m.id === passedMotionId) ?? null;
  const sessionState = committee.motionSessionState ?? {};
  const motionState = sessionState[passedMotionId];
  const isVotingForAgainst =
    passedMotion &&
    getMotionTypeId(passedMotion) === "enter_voting" &&
    isAffirmative(passedMotion.details.two_for_two_against);
  const speakerQueue =
    passedMotion && isFormalSpeakingMotion(passedMotion) && !isVotingForAgainst
      ? motionState?.speakerQueue
      : undefined;
  const votingSpeakers =
    passedMotion && isVotingForAgainst
      ? {
          for: motionState?.speakersFor ?? [],
          against: motionState?.speakersAgainst ?? [],
        }
      : undefined;
  const isPresentDraft =
    passedMotion && getMotionTypeId(passedMotion) === "present_draft";
  const presentationDelegates = isPresentDraft
    ? motionState?.presentationDelegates
    : undefined;
  const qaDelegates = isPresentDraft ? motionState?.qaDelegates : undefined;

  const snapshot: MotionQueueSnapshot = {
    id: snapshotId,
    label: passedMotion
      ? `After: ${passedMotion.type}`
      : `Queue ${(committee.motionQueueHistory?.length ?? 0) + 1}`,
    savedAt,
    passedMotion,
    motions: [...committee.motions],
    speakerQueue:
      speakerQueue && speakerQueue.length > 0 ? speakerQueue : undefined,
    votingSpeakers:
      votingSpeakers &&
      (votingSpeakers.for.length > 0 || votingSpeakers.against.length > 0)
        ? votingSpeakers
        : undefined,
    presentationDelegates:
      presentationDelegates && presentationDelegates.length > 0
        ? presentationDelegates
        : undefined,
    qaDelegates:
      qaDelegates && qaDelegates.length > 0 ? qaDelegates : undefined,
  };

  const archivedIds = new Set(committee.motions.map((m) => m.id));
  const nextSessionState = { ...sessionState };
  archivedIds.forEach((id) => delete nextSessionState[id]);

  return {
    ...committee,
    motions: [],
    motionQueueHistory: [snapshot, ...(committee.motionQueueHistory ?? [])],
    motionSessionState: nextSessionState,
  };
}
