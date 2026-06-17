import { computeRubricTotal } from "@/lib/scoring";
import type { Committee, RubricScore, ScorerRole } from "@/lib/types";

export function updateRubricScore(
  committee: Committee,
  role: ScorerRole,
  delegateId: string,
  scores: Record<string, number>,
  notes?: string
): Committee {
  const key = role === "judge" ? "judgeScores" : "daisScores";
  const existing = committee[key].find((s) => s.delegateId === delegateId);
  const total = computeRubricTotal(scores, committee.type);
  const updated: RubricScore = existing
    ? { ...existing, scores, total, notes: notes ?? existing.notes }
    : { delegateId, scores, total, notes: notes ?? "", signed: false };
  const list = existing
    ? committee[key].map((s) => (s.delegateId === delegateId ? updated : s))
    : [...committee[key], updated];
  return { ...committee, [key]: list };
}

export function signScores(
  committee: Committee,
  role: ScorerRole,
  signedAt: string
): Committee {
  const key = role === "judge" ? "judgeScores" : "daisScores";
  return {
    ...committee,
    [key]: committee[key].map((s) => ({
      ...s,
      signed: true,
      signedAt,
    })),
  };
}

export function updatePositionPaperScore(
  committee: Committee,
  delegateId: string,
  score: number,
  notes?: string
): Committee {
  const existing = committee.positionPaperScores.find(
    (s) => s.delegateId === delegateId
  );
  const entry = { delegateId, score, notes: notes ?? "" };
  return {
    ...committee,
    positionPaperScores: existing
      ? committee.positionPaperScores.map((s) =>
          s.delegateId === delegateId ? entry : s
        )
      : [...committee.positionPaperScores, entry],
  };
}

export function setVcRecipient(
  committee: Committee,
  delegateId: string | undefined
): Committee {
  return { ...committee, vcRecipientId: delegateId };
}
