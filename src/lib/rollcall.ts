import type { Committee } from "./types";

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
