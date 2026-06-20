import type { HeaderGlobeFlashKind } from "@/context/HeaderGlobeFlashContext";

export const TIMER_WARNING_SECONDS = 5;

type TriggerFlash = (kind: Exclude<HeaderGlobeFlashKind, null>) => void;

/** Flash when a running timer enters the final warning window. */
export function onTimerStartWarning(
  secondsRemaining: number,
  triggerFlash: TriggerFlash
) {
  if (
    secondsRemaining > 0 &&
    secondsRemaining <= TIMER_WARNING_SECONDS
  ) {
    triggerFlash("timer");
  }
}

/** Flash after each tick while seconds remaining are in the warning window. */
export function onTimerTickWarning(
  current: number,
  next: number,
  triggerFlash: TriggerFlash
) {
  if (current > 0 && next <= TIMER_WARNING_SECONDS) {
    triggerFlash("timer");
  }
}
