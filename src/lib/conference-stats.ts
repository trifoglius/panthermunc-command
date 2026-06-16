import type { Committee, Motion } from "./types";

/** All passed motions for a committee, including archived queue history. */
export function getPassedMotions(committee: Committee): Motion[] {
  const fromCurrent = committee.motions.filter((m) => m.status === "passed");
  const fromHistory = (committee.motionQueueHistory ?? []).flatMap((snapshot) =>
    snapshot.motions.filter((m) => m.status === "passed")
  );

  const byId = new Map<string, Motion>();
  for (const motion of [...fromCurrent, ...fromHistory]) {
    byId.set(motion.id, motion);
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getCommitteeStats(committee: Committee) {
  const latestRollCall = committee.rollCalls[0] ?? null;
  const presentCount = latestRollCall
    ? Object.values(latestRollCall.attendance).filter(
        (s) => s === "present" || s === "present_voting"
      ).length
    : null;

  const passedMotions = getPassedMotions(committee);
  const adoptedResolutions = committee.documents.filter(
    (d) => d.type === "draft_resolution" && d.status === "adopted"
  ).length;

  return {
    presentCount,
    passedMotions: passedMotions.length,
    lastPassedMotion: passedMotions[0] ?? null,
    adoptedResolutions,
  };
}
