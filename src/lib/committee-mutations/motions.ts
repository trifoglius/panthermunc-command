import { getMotionTypeId } from "@/lib/motion-timers";
import {
  applyPassedMotionEffects,
  caucusSpeakerListForArchive,
  clearActiveCaucus,
  clearSuspension,
  clearVoteContext,
} from "@/lib/committee-mutations/session";
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

  const speakerQueue = resolveModeratedCaucusSpeakers(
    committee,
    passedMotionId,
    typeId
  );

  const votingSpeakers = votingSpeakersForArchive(
    committee,
    passedMotionId,
    typeId
  );

  const snapshot: MotionQueueSnapshot = {
    id: snapshotId,
    label: passedMotion
      ? `Ended: ${passedMotion.type}`
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

  const ended = endMotionSession(committee, passedMotion, speakerQueue);

  return {
    ...ended,
    motions: [],
    motionQueueHistory: [snapshot, ...(committee.motionQueueHistory ?? [])],
  };
}

function votingSpeakersForArchive(
  committee: Committee,
  passedMotionId: string,
  typeId: string | undefined
): { for: string[]; against: string[] } | undefined {
  if (typeId !== "division_question" && typeId !== "competence") {
    return undefined;
  }
  const voteCtx = committee.sessionState?.voteContext;
  if (!voteCtx) return undefined;
  if (
    voteCtx.target.type !== "division" &&
    voteCtx.target.type !== "competence"
  ) {
    return undefined;
  }
  if (voteCtx.target.id !== passedMotionId) return undefined;
  return {
    for: voteCtx.speakersFor ?? [],
    against: voteCtx.speakersAgainst ?? [],
  };
}

/** Stop the live procedure for this motion, then the caller files the log. */
function endMotionSession(
  committee: Committee,
  motion: Motion | null,
  speakerQueue: string[] | undefined
): Committee {
  if (!motion) return committee;

  const typeId = getMotionTypeId(motion);
  let next = committee;

  if (speakerQueue && speakerQueue.length > 0) {
    const prev = next.motionSessionState?.[motion.id] ?? {};
    next = {
      ...next,
      motionSessionState: {
        ...(next.motionSessionState ?? {}),
        [motion.id]: {
          ...prev,
          speakerQueue,
        },
      },
    };
  }

  if (next.sessionState?.activeCaucus?.motionId === motion.id) {
    next = clearActiveCaucus(next);
  }

  if (typeId === "suspend_meeting" && next.sessionState?.suspension?.active) {
    next = clearSuspension(next);
  }

  const vote = next.sessionState?.voteContext;
  if (
    vote &&
    (vote.target.type === "division" || vote.target.type === "competence") &&
    vote.target.id === motion.id
  ) {
    next = clearVoteContext(next);
  }

  return next;
}
