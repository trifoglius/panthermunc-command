import type { Committee, RollCallSession } from "./types";

/** Returns true if the delegate is present or present & voting on the latest roll call. */
export function isDelegatePresent(
  committee: Committee,
  delegateId: string
): boolean {
  const latestRollCall = committee.rollCalls[0];
  if (!latestRollCall) return true;
  const status = latestRollCall.attendance[delegateId];
  return status === "present" || status === "present_voting";
}

/** Count delegates marked present or present & voting in a roll call session. */
export function countPresent(session: RollCallSession): number {
  return Object.values(session.attendance).filter(
    (s) => s === "present" || s === "present_voting"
  ).length;
}

/** Count delegates marked present & voting in a roll call session. */
export function countPresentVoting(session: RollCallSession): number {
  return Object.values(session.attendance).filter(
    (s) => s === "present_voting"
  ).length;
}

/** True if the given session has quorum (more than half of total delegates present). */
export function computeQuorumMet(
  session: RollCallSession,
  totalDelegates: number
): boolean {
  return countPresent(session) > totalDelegates / 2;
}
