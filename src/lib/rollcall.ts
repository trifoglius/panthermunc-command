import type { Committee, Delegate, RollCallSession } from "./types";

/** Present includes legacy present_voting for old roll-call data. */
export function isDelegatePresent(
  committee: Committee,
  delegateId: string
): boolean {
  const latestRollCall = committee.rollCalls[0];
  if (!latestRollCall) return true;
  const status = latestRollCall.attendance[delegateId];
  return status === "present" || status === "present_voting";
}

export function countPresent(session: RollCallSession): number {
  return Object.values(session.attendance).filter(
    (s) => s === "present" || s === "present_voting"
  ).length;
}

/** @deprecated Present & Voting removed; returns 0 for new sessions. */
export function countPresentVoting(session: RollCallSession): number {
  return Object.values(session.attendance).filter(
    (s) => s === "present_voting"
  ).length;
}

export function computeQuorumMet(
  session: RollCallSession,
  totalDelegates: number
): boolean {
  return countPresent(session) > totalDelegates / 2;
}

export function getLatestRollCall(committee: Committee): RollCallSession | null {
  return committee.rollCalls[0] ?? null;
}

/** All present members are eligible for recorded votes. */
export function getRollCallVotingDelegates(
  committee: Committee,
  session: RollCallSession
): Delegate[] {
  return committee.delegates.filter((d) => {
    const status = session.attendance[d.id];
    return status === "present" || status === "present_voting";
  });
}

/** All present members may abstain. */
export function canDelegateAbstainOnRollCall(
  _session: RollCallSession,
  _delegateId: string
): boolean {
  return true;
}
