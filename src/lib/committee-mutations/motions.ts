import { getMotionTypeId } from "@/lib/motion-timers";
import {
  applyPassedMotionEffects,
  caucusSpeakerListForArchive,
} from "@/lib/committee-mutations/session";
import { deriveSessionPhase, ensureSessionState } from "@/lib/session-state";
import type {
  Committee,
  Motion,
  MotionQueueSnapshot,
} from "@/lib/types";

export function addMotion(committee: Committee, motion: Motion): Committee {
  return { ...committee, motions: [motion, ...committee.motions] };
}

export function updateMotion(committee: Committee, motion: Motion): Committee {
  const previous = committee.motions.find((m) => m.id === motion.id);
  let next: Committee = {
    ...committee,
    motions: committee.motions.map((m) => (m.id === motion.id ? motion : m)),
  };

  if (motion.status === "passed" && previous?.status !== "passed") {
    next = applyPassedMotionEffects(next, motion);
  }

  return next;
}

function resolveModeratedCaucusSpeakers(
  committee: Committee,
  passedMotionId: string,
  typeId: string | undefined
): string[] | undefined {
  if (typeId !== "moderated_caucus") return undefined;

  const caucus = committee.sessionState?.activeCaucus;
  if (caucus?.motionId === passedMotionId) {
    const fromActive = caucusSpeakerListForArchive(caucus);
    if (fromActive.length > 0) return fromActive;
  }

  const saved = committee.motionSessionState?.[passedMotionId]?.speakerQueue;
  if (saved && saved.length > 0) return [...saved];

  return undefined;
}

export function archiveMotionQueue(
  committee: Committee,
  passedMotionId: string,
  snapshotId: string,
  savedAt: string
): Committee {
  const passedMotion =
    committee.motions.find((m) => m.id === passedMotionId) ?? null;
  const typeId = passedMotion ? getMotionTypeId(passedMotion) : undefined;
  const voteCtx = committee.sessionState?.voteContext;

  const speakerQueue = resolveModeratedCaucusSpeakers(
    committee,
    passedMotionId,
    typeId
  );

  const votingSpeakers =
    (typeId === "division_question" || typeId === "competence") && voteCtx
      ? {
          for: voteCtx.speakersFor ?? [],
          against: voteCtx.speakersAgainst ?? [],
        }
      : undefined;

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
  };

  let nextSession = committee.sessionState
    ? ensureSessionState(committee.sessionState, committee.topic)
    : undefined;
  if (nextSession?.activeCaucus?.motionId === passedMotionId) {
    nextSession = {
      ...nextSession,
      activeCaucus: undefined,
    };
    nextSession = {
      ...nextSession,
      phase: deriveSessionPhase(nextSession),
    };
  }

  // Keep motionSessionState speaker list for the archived caucus motion as well.
  let nextMotionSession = committee.motionSessionState ?? {};
  if (speakerQueue && speakerQueue.length > 0) {
    nextMotionSession = {
      ...nextMotionSession,
      [passedMotionId]: {
        ...nextMotionSession[passedMotionId],
        speakerQueue,
      },
    };
  }

  return {
    ...committee,
    motions: [],
    motionQueueHistory: [snapshot, ...(committee.motionQueueHistory ?? [])],
    motionSessionState: nextMotionSession,
    sessionState: nextSession,
  };
}
