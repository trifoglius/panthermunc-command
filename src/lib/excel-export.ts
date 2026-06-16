import * as XLSX from "xlsx";
import type { Committee, Conference } from "./types";
import { buildDelegateStats, getAwardPreview } from "./scoring";

function sheetFromRows(rows: Record<string, unknown>[], name: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  return { name, ws };
}

export function exportCommitteeToExcel(committee: Committee) {
  const stats = buildDelegateStats(committee);
  const awards = getAwardPreview(committee);

  const delegateRows = committee.delegates.map((d) => {
    const s = stats.find((x) => x.delegateId === d.id);
    return {
      Country: d.country,
      Delegate: d.delegateName,
      "Position Paper Status": d.positionPaperStatus.toUpperCase(),
      Speeches: s?.speeches ?? 0,
      "Speaking Time (sec)": s?.totalSpeakingSeconds ?? 0,
      "Motions Proposed": s?.motionsProposed ?? 0,
      "Docs Sponsored": s?.documentsSponsored ?? 0,
      "Docs Signed": s?.documentsSigned ?? 0,
      "Points Raised": s?.pointsRaised ?? 0,
      "Judge Score": s?.judgeScore ?? "",
      "Dais Score": s?.daisScore ?? "",
      "Composite Score": s?.compositeScore ?? "",
      "Abs. Difference": s?.absoluteDifference ?? "",
      Rank: s?.rank ?? "",
      "PP Score": s?.positionPaperScore ?? "",
      "Special Circumstance": s?.specialCircumstance ?? "",
    };
  });

  const motionRows = committee.motions.map((m) => {
    const proposer = committee.delegates.find((d) => d.id === m.proposedBy);
    return {
      Timestamp: new Date(m.timestamp).toLocaleString(),
      Motion: m.type,
      ProposedBy: proposer?.country ?? m.proposedBy,
      Status: m.status,
      Disruptivity: m.disruptivity,
      "Votes For": m.votesFor ?? "",
      "Votes Against": m.votesAgainst ?? "",
      Abstain: m.votesAbstain ?? "",
      ...m.details,
      Notes: m.notes ?? "",
    };
  });

  const documentRows = committee.documents.map((doc) => ({
    Title: doc.title,
    Type: doc.type,
    Status: doc.status,
    Link: doc.link ?? "",
    Sponsors: doc.sponsors
      .map((id) => committee.delegates.find((d) => d.id === id)?.country ?? id)
      .join(", "),
    Signatories: doc.signatories
      .map((id) => committee.delegates.find((d) => d.id === id)?.country ?? id)
      .join(", "),
    "Author Panel": doc.authorPanel
      .map((id) => committee.delegates.find((d) => d.id === id)?.country ?? id)
      .join(", "),
    "Submitted At": doc.submittedAt
      ? new Date(doc.submittedAt).toLocaleString()
      : "",
    Amendments: doc.amendments.length,
  }));

  const rollCallRows = committee.rollCalls.flatMap((rc) =>
    committee.delegates.map((d) => ({
      Session: rc.label,
      Timestamp: new Date(rc.timestamp).toLocaleString(),
      Country: d.country,
      Status: rc.attendance[d.id] ?? "absent",
      "Quorum Met": rc.quorumMet ? "Yes" : "No",
    }))
  );

  const awardsRows = [
    {
      Award: "Best Delegate",
      Country: awards.bestDelegate?.country ?? "",
      Delegate: awards.bestDelegate?.delegateName ?? "",
      Score: awards.bestDelegate?.compositeScore ?? "",
    },
    {
      Award: "Outstanding Delegate",
      Country: awards.outstandingDelegate?.country ?? "",
      Delegate: awards.outstandingDelegate?.delegateName ?? "",
      Score: awards.outstandingDelegate?.compositeScore ?? "",
    },
    {
      Award: "Honorable Delegate",
      Country: awards.honorableDelegate?.country ?? "",
      Delegate: awards.honorableDelegate?.delegateName ?? "",
      Score: awards.honorableDelegate?.compositeScore ?? "",
    },
    {
      Award: "Verbal Commendation",
      Country: awards.verbalCommendation?.country ?? "",
      Delegate: awards.verbalCommendation?.delegateName ?? "",
      Score: "",
    },
    {
      Award: "Position Paper",
      Country: awards.positionPaper?.country ?? "",
      Delegate: awards.positionPaper?.delegateName ?? "",
      Score: awards.positionPaper?.positionPaperScore ?? "",
    },
  ];

  const wb = XLSX.utils.book_new();
  const sheets = [
    sheetFromRows(delegateRows, "Delegate Stats"),
    sheetFromRows(motionRows, "Motions"),
    sheetFromRows(documentRows, "Documents"),
    sheetFromRows(rollCallRows, "Roll Call"),
    sheetFromRows(awardsRows, "Awards Preview"),
  ];
  sheets.forEach(({ name, ws }) => XLSX.utils.book_append_sheet(wb, ws, name));

  const filename = `${committee.name.replace(/\s+/g, "_")}_export.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportFullConferenceToExcel(conference: Conference) {
  const summaryRows = conference.committees.flatMap((c) => {
    const stats = buildDelegateStats(c);
    return stats.map((s) => ({
      Committee: c.name,
      Country: s.country,
      Delegate: s.delegateName,
      "Composite Score": s.compositeScore ?? "",
      Rank: s.rank ?? "",
      "Judge Score": s.judgeScore ?? "",
      "Dais Score": s.daisScore ?? "",
      "Abs. Difference": s.absoluteDifference ?? "",
      "Special Circumstance": s.specialCircumstance ?? "",
    }));
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows),
    "All Committees"
  );

  conference.committees.forEach((c) => {
    const stats = buildDelegateStats(c);
    const rows = stats.map((s) => ({
      Country: s.country,
      Delegate: s.delegateName,
      Speeches: s.speeches,
      "Composite Score": s.compositeScore ?? "",
      Rank: s.rank ?? "",
    }));
    const safeName = c.name.slice(0, 31).replace(/[\\/?*[\]]/g, "");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows),
      safeName
    );
  });

  XLSX.writeFile(wb, `PantherMUNC_${conference.year}_Full_Export.xlsx`);
}
