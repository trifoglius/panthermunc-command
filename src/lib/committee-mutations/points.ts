import type { Committee, Point, AppealStatus } from "@/lib/types";
import { setOpenAppeal } from "@/lib/committee-mutations/session";
import { proceduralMotionPasses } from "@/lib/session-state";

export function addPoint(committee: Committee, point: Point): Committee {
  return { ...committee, points: [point, ...committee.points] };
}

export function resolvePoint(committee: Committee, id: string): Committee {
  return {
    ...committee,
    points: committee.points.map((p) =>
      p.id === id ? { ...p, resolved: true } : p
    ),
  };
}

export function updatePoint(committee: Committee, point: Point): Committee {
  return {
    ...committee,
    points: committee.points.map((p) => (p.id === point.id ? point : p)),
  };
}

export function setPointRuling(
  committee: Committee,
  pointId: string,
  chairRuling: string
): Committee {
  const points = committee.points.map((p) =>
    p.id === pointId
      ? { ...p, chairRuling, appealStatus: p.appealStatus ?? ("none" as AppealStatus) }
      : p
  );
  return { ...committee, points };
}

export function startAppeal(
  committee: Committee,
  pointId: string,
  chairRuling: string
): Committee {
  const points = committee.points.map((p) =>
    p.id === pointId
      ? {
          ...p,
          chairRuling,
          appealStatus: "pending" as const,
        }
      : p
  );
  let next: Committee = { ...committee, points };
  next = setOpenAppeal(next, {
    pointId,
    chairRuling,
    status: "pending",
  });
  return next;
}

export function resolveAppeal(
  committee: Committee,
  pointId: string,
  votesFor: number,
  votesAgainst: number,
  votesAbstain = 0
): Committee {
  const overruled = proceduralMotionPasses(votesFor, votesAgainst);
  const status: AppealStatus = overruled ? "overruled" : "sustained";
  const points = committee.points.map((p) =>
    p.id === pointId
      ? {
          ...p,
          appealStatus: status,
          appealVotesFor: votesFor,
          appealVotesAgainst: votesAgainst,
          appealVotesAbstain: votesAbstain,
          resolved: true,
        }
      : p
  );
  let next: Committee = { ...committee, points };
  next = setOpenAppeal(next, {
    pointId,
    chairRuling:
      committee.points.find((p) => p.id === pointId)?.chairRuling ?? "",
    status: overruled ? "overruled" : "sustained",
    votes: { yes: votesFor, no: votesAgainst, abstain: votesAbstain },
  });
  return next;
}
