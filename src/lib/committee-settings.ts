import type { Committee, CommitteeType } from "./types";

/** Apply committee type change (e.g. GA ↔ crisis). */
export function applyCommitteeTypeChange(
  committee: Committee,
  newType: CommitteeType
): Committee {
  if (committee.type === newType) return committee;
  return {
    ...committee,
    type: newType,
    requirePositionPapers: newType === "ga",
  };
}
