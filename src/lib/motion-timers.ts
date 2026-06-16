import { MOTION_TYPES } from "./constants";
import type { Motion } from "./types";

export interface MotionTimerConfig {
  totalSeconds?: number;
  speakingSeconds?: number;
  phases?: { label: string; seconds: number }[];
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
  speakOrder?: string
): string[] {
  if (!speakOrder || !proposedBy) return queue;
  const unique = queue.filter((id, index) => queue.indexOf(id) === index);
  const others = unique.filter((id) => id !== proposedBy);
  if (speakOrder === "first") return [proposedBy, ...others];
  if (speakOrder === "last") return [...others, proposedBy];
  return unique;
}

export function addSpeakerWithReserve(
  queue: string[],
  speakerId: string,
  proposedBy: string,
  speakOrder?: string
): string[] {
  const next = queue.includes(speakerId) ? queue : [...queue, speakerId];
  return applySpeakOrderReserve(next, proposedBy, speakOrder);
}

export function getMotionTypeId(motion: Motion): string | undefined {
  if (motion.motionTypeId) return motion.motionTypeId;
  const match = MOTION_TYPES.find((m) => m.label === motion.type);
  return match?.id;
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
    case "open_speakers_list":
      return {
        speakingSeconds: parseSeconds(d.speaking_time),
        hasSpeakerQueue: true,
        speakingEventType: "gsl",
      };
    case "unmoderated_caucus":
    case "gentlemans_caucus":
      return {
        totalSeconds: parseMinutes(d.duration),
        hasSpeakerQueue: false,
        speakingEventType: "unmoderated_caucus",
      };
    case "round_robin":
      return {
        speakingSeconds: parseSeconds(d.speaking_time),
        hasSpeakerQueue: true,
        speakingEventType: "round_robin",
      };
    case "present_draft": {
      const phases = [
        { label: "Reading Period", seconds: parseMinutes(d.reading_period) },
        {
          label: "Presentation Period",
          seconds: parseMinutes(d.presentation_period),
        },
        { label: "Q&A Period", seconds: parseMinutes(d.qa_period) },
      ].filter((p) => p.seconds > 0);
      if (phases.length === 0) return null;
      return {
        phases,
        hasSpeakerQueue: false,
        speakingEventType: "presentation",
      };
    }
    case "enter_voting":
      if (!isAffirmative(d.two_for_two_against)) return null;
      {
        const speakingSeconds = parseSeconds(d.speaking_time) || 120;
        return {
          totalSeconds: speakingSeconds * 4,
          speakingSeconds,
          hasSpeakerQueue: true,
          queueMode: "for_against",
          speakingEventType: "voting_procedure",
          votingSpeakerOrder: parseVotingSpeakerOrder(d.speaker_order),
        };
      }
    default:
      return null;
  }
}

function parseMinutes(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n * 60 : 0;
}

function parseSeconds(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const FORMAL_SPEAKING_IDS = new Set([
  "open_speakers_list",
  "moderated_caucus",
  "round_robin",
]);

export function isFormalSpeakingMotion(motion: Motion): boolean {
  const typeId = getMotionTypeId(motion);
  if (!typeId) return false;
  if (typeId === "enter_voting") {
    return isAffirmative(motion.details.two_for_two_against);
  }
  return FORMAL_SPEAKING_IDS.has(typeId);
}

export function motionHasTimer(motion: Motion): boolean {
  return getTimerConfig(motion) !== null;
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
