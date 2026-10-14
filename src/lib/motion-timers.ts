import { MOTION_TYPES } from "./constants";
import type { Motion } from "./types";

export interface MotionTimerConfig {
  totalSeconds?: number;
  speakingSeconds?: number;
  phases?: {
    label: string;
    seconds: number;
    phaseKind?: "reading" | "presentation" | "qa";
  }[];
  hasSpeakerQueue: boolean;
  queueMode?: "single" | "for_against";
  speakingEventType: string;
  votingSpeakerOrder?: VotingSpeakerOrder;
}

export type VotingSpeakerOrder = "for_first" | "against_first";

export function isAffirmative(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "yes" || normalized === "y" || normalized === "true";
}

export function parseVotingSpeakerOrder(value?: string): VotingSpeakerOrder {
  if (!value) return "for_first";
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "against_first" ||
    normalized === "against first" ||
    normalized.startsWith("against")
  ) {
    return "against_first";
  }
  return "for_first";
}

export function applySpeakOrderReserve(
  queue: string[],
  proposedBy: string,
  speakOrder?: string,
  completedCount = 0
): string[] {
  if (!speakOrder || !proposedBy) return queue;
  const completed = queue.slice(0, completedCount);
  const pending = queue.slice(completedCount);
  const pendingUnique = pending.filter(
    (id, index) => pending.indexOf(id) === index
  );
  const others = pendingUnique.filter((id) => id !== proposedBy);
  let reordered: string[];
  if (speakOrder === "first") reordered = [proposedBy, ...others];
  else if (speakOrder === "last") reordered = [...others, proposedBy];
  else reordered = pendingUnique;
  return [...completed, ...reordered];
}

export function addSpeakerWithReserve(
  queue: string[],
  speakerId: string,
  proposedBy: string,
  speakOrder?: string,
  completedCount = 0
): string[] {
  return applySpeakOrderReserve(
    [...queue, speakerId],
    proposedBy,
    speakOrder,
    completedCount
  );
}

export function getMotionTypeId(motion: Motion): string | undefined {
  if (motion.motionTypeId) return motion.motionTypeId;
  const match = MOTION_TYPES.find((m) => m.label === motion.type);
  return match?.id;
}

export function parseMinutes(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n * 60 : 0;
}

export function parseSeconds(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function getTimerConfig(motion: Motion): MotionTimerConfig | null {
  const typeId = getMotionTypeId(motion);
  if (!typeId) return null;

  const d = motion.details;

  switch (typeId) {
    case "moderated_caucus":
      return {
        totalSeconds: parseMinutes(d.duration),
        speakingSeconds: parseSeconds(d.speaking_time),
        hasSpeakerQueue: true,
        speakingEventType: "moderated_caucus",
      };
    case "suspend_meeting":
      return {
        totalSeconds: parseMinutes(d.duration),
        hasSpeakerQueue: false,
        speakingEventType: "suspension",
      };
    case "division_question":
    case "competence":
      return {
        speakingSeconds: parseSeconds(d.speaking_time) || 60,
        hasSpeakerQueue: true,
        queueMode: "for_against",
        speakingEventType: "procedural_debate",
        votingSpeakerOrder: "for_first",
      };
    default:
      return null;
  }
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function isFormalSpeakingMotion(motion: Motion): boolean {
  return getMotionTypeId(motion) === "moderated_caucus";
}

export function motionHasTimer(motion: Motion): boolean {
  return getTimerConfig(motion) !== null;
}

export function motionHasActiveSession(motion: Motion): boolean {
  const id = getMotionTypeId(motion);
  return (
    id === "moderated_caucus" ||
    id === "division_question" ||
    id === "competence" ||
    id === "suspend_meeting"
  );
}

export function buildVotingSpeakerQueue(
  speakersFor: string[],
  speakersAgainst: string[],
  speakerOrder: VotingSpeakerOrder = "for_first"
): string[] {
  const max = Math.max(speakersFor.length, speakersAgainst.length);
  const result: string[] = [];
  for (let i = 0; i < max; i++) {
    if (speakerOrder === "for_first") {
      if (speakersFor[i]) result.push(speakersFor[i]);
      if (speakersAgainst[i]) result.push(speakersAgainst[i]);
    } else {
      if (speakersAgainst[i]) result.push(speakersAgainst[i]);
      if (speakersFor[i]) result.push(speakersFor[i]);
    }
  }
  return result;
}
