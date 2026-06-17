import { createEmptyRubricScore } from "@/lib/scoring";
import type { Committee, Delegate, PositionPaperStatus } from "@/lib/types";

export function addDelegate(
  committee: Committee,
  delegate: Delegate
): Committee {
  return {
    ...committee,
    delegates: [...committee.delegates, delegate],
    judgeScores: [
      ...committee.judgeScores,
      createEmptyRubricScore(delegate.id, committee.type),
    ],
    daisScores: [
      ...committee.daisScores,
      createEmptyRubricScore(delegate.id, committee.type),
    ],
  };
}

export function updateDelegate(
  committee: Committee,
  delegate: Delegate
): Committee {
  return {
    ...committee,
    delegates: committee.delegates.map((d) =>
      d.id === delegate.id ? delegate : d
    ),
  };
}

export function removeDelegate(committee: Committee, id: string): Committee {
  return {
    ...committee,
    delegates: committee.delegates.filter((d) => d.id !== id),
    judgeScores: committee.judgeScores.filter((s) => s.delegateId !== id),
    daisScores: committee.daisScores.filter((s) => s.delegateId !== id),
  };
}
