import { MOTION_TYPES } from "./constants";
import { isAffirmative } from "./motion-timers";

function parseMinutes(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n * 60 : 0;
}

function parseSeconds(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function estimateSpeakerSlots(durationSeconds: number, speakingSeconds: number): number {
  if (durationSeconds <= 0 || speakingSeconds <= 0) return 0;
  return Math.floor(durationSeconds / speakingSeconds);
}

function countListedSpeakers(order?: string): number {
  if (!order?.trim()) return 0;
  return order
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export function computeMotionDisruptivity(
  motionTypeId: string,
  baseDisruptivity: number,
  details: Record<string, string>
): number {
  switch (motionTypeId) {
    case "moderated_caucus": {
      const slots = estimateSpeakerSlots(
        parseMinutes(details.duration),
        parseSeconds(details.speaking_time)
      );
      return baseDisruptivity + slots;
    }
    case "round_robin": {
      const slots = countListedSpeakers(details.order);
      return slots > 0 ? baseDisruptivity + slots : baseDisruptivity;
    }
    case "enter_voting":
      if (isAffirmative(details.two_for_two_against)) {
        return baseDisruptivity + 4;
      }
      return baseDisruptivity;
    default:
      return baseDisruptivity;
  }
}

export function computeMotionDisruptivityFromMotion(motion: {
  motionTypeId?: string;
  type: string;
  details: Record<string, string>;
}): number {
  const motionTypeId =
    motion.motionTypeId ??
    MOTION_TYPES.find((m) => m.label === motion.type)?.id;
  if (!motionTypeId) return 0;
  const base =
    MOTION_TYPES.find((m) => m.id === motionTypeId)?.disruptivity ?? 0;
  return computeMotionDisruptivity(motionTypeId, base, motion.details);
}
