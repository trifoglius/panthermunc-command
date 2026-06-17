import type { Committee, Point } from "@/lib/types";

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
