/** Parse comma-separated document IDs from a motion detail field. */
export function parseDocumentOrder(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function serializeDocumentOrder(ids: string[]): string {
  return ids.join(",");
}

/**
 * Thresholds based on the number of present + present-and-voting delegates,
 * assuming each casts a yes/no vote (no abstentions). Abstentions are excluded
 * when tallying actual paper votes.
 */
export function getVoteThresholds(votingBase: number) {
  return {
    simpleMajority: Math.floor(votingBase / 2) + 1,
    superMajority: Math.ceil((votingBase * 2) / 3),
  };
}

/** Draft resolutions require a two-thirds majority of votes cast (yes + no). */
export function draftResolutionPasses(votesFor: number, votesAgainst: number): boolean {
  const votesCast = votesFor + votesAgainst;
  if (votesCast === 0) return false;
  const required = Math.ceil((votesCast * 2) / 3);
  return votesFor >= required;
}

export function requiredYesForSupermajority(votesFor: number, votesAgainst: number): number {
  const votesCast = votesFor + votesAgainst;
  if (votesCast === 0) return 0;
  return Math.ceil((votesCast * 2) / 3);
}
