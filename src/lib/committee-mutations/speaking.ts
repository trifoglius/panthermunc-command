import type { Committee, SpeakingEvent } from "@/lib/types";

export function addSpeakingEvent(
  committee: Committee,
  event: SpeakingEvent
): Committee {
  return {
    ...committee,
    speakingEvents: [event, ...committee.speakingEvents],
  };
}
