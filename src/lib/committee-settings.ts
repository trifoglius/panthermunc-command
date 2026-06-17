import { createEmptyRubricScore } from "./scoring";
import type { Committee, CommitteeType } from "./types";

/** Apply committee type change, resetting rubrics to match the new scoring model. */
export function applyCommitteeTypeChange(
  committee: Committee,
  newType: CommitteeType
): Committee {
  if (committee.type === newType) return committee;
  return {
    ...committee,
    type: newType,
    requirePositionPapers: newType === "ga",
    judgeScores: committee.delegates.map((d) => {
      const existing = committee.judgeScores.find((s) => s.delegateId === d.id);
      const fresh = createEmptyRubricScore(d.id, newType);
      if (!existing) return fresh;
      return { ...fresh, notes: existing.notes };
    }),
    daisScores: committee.delegates.map((d) => {
      const existing = committee.daisScores.find((s) => s.delegateId === d.id);
      const fresh = createEmptyRubricScore(d.id, newType);
      if (!existing) return fresh;
      return { ...fresh, notes: existing.notes };
    }),
  };
}
