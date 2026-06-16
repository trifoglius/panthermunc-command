import { CRISIS_RUBRIC, GA_RUBRIC } from "./constants";
import type {
  Committee,
  CommitteeType,
  DelegateStats,
  RubricScore,
} from "./types";

export function getRubric(type: CommitteeType) {
  return type === "crisis" ? CRISIS_RUBRIC : GA_RUBRIC;
}

export function computeRubricTotal(
  scores: Record<string, number>,
  type: CommitteeType
): number {
  const rubric = getRubric(type);
  return rubric.reduce((sum, cat) => sum + (scores[cat.key] ?? 0), 0);
}

export function createEmptyRubricScore(
  delegateId: string,
  type: CommitteeType
): RubricScore {
  const scores: Record<string, number> = {};
  getRubric(type).forEach((cat) => {
    scores[cat.key] = 0;
  });
  return {
    delegateId,
    scores,
    total: 0,
    notes: "",
    signed: false,
  };
}

export function buildDelegateStats(committee: Committee): DelegateStats[] {
  const judgeMap = new Map(
    committee.judgeScores.map((s) => [s.delegateId, s])
  );
  const daisMap = new Map(committee.daisScores.map((s) => [s.delegateId, s]));
  const ppMap = new Map(
    committee.positionPaperScores.map((s) => [s.delegateId, s])
  );

  const stats: DelegateStats[] = committee.delegates.map((d) => {
    const speeches = committee.speakingEvents.filter(
      (e) => e.delegateId === d.id
    );
    const motionsProposed = committee.motions.filter(
      (m) => m.proposedBy === d.id
    ).length;
    const documentsSponsored = committee.documents.filter((doc) =>
      doc.sponsors.includes(d.id)
    ).length;
    const documentsSigned = committee.documents.filter((doc) =>
      doc.signatories.includes(d.id)
    ).length;
    const pointsRaised = committee.points.filter(
      (p) => p.delegateId === d.id
    ).length;

    const judge = judgeMap.get(d.id);
    const dais = daisMap.get(d.id);
    const pp = ppMap.get(d.id);

    let compositeScore: number | undefined;
    let absoluteDifference: number | undefined;
    if (judge && dais) {
      compositeScore = (judge.total + dais.total) / 2;
      absoluteDifference = Math.abs(judge.total - dais.total);
    }

    return {
      delegateId: d.id,
      country: d.country,
      delegateName: d.delegateName,
      speeches: speeches.length,
      totalSpeakingSeconds: speeches.reduce(
        (sum, e) => sum + (e.durationSeconds ?? 0),
        0
      ),
      motionsProposed,
      documentsSponsored,
      documentsSigned,
      pointsRaised,
      judgeScore: judge?.total,
      daisScore: dais?.total,
      compositeScore,
      absoluteDifference,
      positionPaperScore: pp?.score,
      positionPaperStatus: d.positionPaperStatus,
    };
  });

  const ranked = [...stats]
    .filter((s) => s.compositeScore !== undefined)
    .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));

  ranked.forEach((s, i) => {
    const target = stats.find((x) => x.delegateId === s.delegateId);
    if (target) target.rank = i + 1;
  });

  const compositeGroups = new Map<number, DelegateStats[]>();
  stats.forEach((s) => {
    if (s.compositeScore === undefined) return;
    const rounded = Math.round(s.compositeScore * 100) / 100;
    const group = compositeGroups.get(rounded) ?? [];
    group.push(s);
    compositeGroups.set(rounded, group);
  });

  stats.forEach((s) => {
    const issues: ("discrepancy" | "tie")[] = [];
    if (
      s.absoluteDifference !== undefined &&
      s.absoluteDifference > committee.discrepancyThreshold
    ) {
      issues.push("discrepancy");
    }
    if (s.compositeScore !== undefined) {
      const rounded = Math.round(s.compositeScore * 100) / 100;
      const group = compositeGroups.get(rounded) ?? [];
      if (group.length > 1) issues.push("tie");
    }
    if (issues.length === 2) s.specialCircumstance = "both";
    else if (issues.length === 1) s.specialCircumstance = issues[0];
  });

  return stats.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
}

export function getAwardPreview(committee: Committee) {
  const stats = buildDelegateStats(committee);
  const ranked = stats.filter((s) => s.rank !== undefined);
  return {
    bestDelegate: ranked[0],
    outstandingDelegate: ranked[1],
    honorableDelegate: ranked[2],
    verbalCommendation: committee.vcRecipientId
      ? stats.find((s) => s.delegateId === committee.vcRecipientId)
      : undefined,
    positionPaper: [...stats]
      .filter((s) => s.positionPaperScore !== undefined)
      .sort(
        (a, b) => (b.positionPaperScore ?? 0) - (a.positionPaperScore ?? 0)
      )[0],
    specialCircumstances: stats.filter((s) => s.specialCircumstance),
    noPositionPaper: stats.filter((s) => s.positionPaperStatus === "none"),
  };
}

export function checkQuorum(
  attendance: Record<string, string>,
  totalDelegates: number
): boolean {
  const voting = Object.values(attendance).filter(
    (s) => s === "present" || s === "present_voting"
  ).length;
  return voting > totalDelegates / 2;
}
