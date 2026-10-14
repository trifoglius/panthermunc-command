import type { Committee, DelegateStats } from "./types";

export function buildDelegateStats(committee: Committee): DelegateStats[] {
  return committee.delegates
    .map((d) => {
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
        positionPaperStatus: d.positionPaperStatus,
      };
    })
    .sort((a, b) => a.country.localeCompare(b.country));
}
