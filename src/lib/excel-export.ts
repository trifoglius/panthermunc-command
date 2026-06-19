import * as XLSX from "xlsx";
import type { Committee, Conference, Motion, MotionQueueSnapshot } from "./types";
import { buildDelegateStats, getAwardPreview } from "./scoring";

function sheetFromRows(rows: Record<string, unknown>[], name: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  return { name, ws };
}

function delegateCountry(committee: Committee, id: string): string {
  return committee.delegates.find((d) => d.id === id)?.country ?? id;
}

function formatDelegateList(committee: Committee, ids: string[] | undefined): string {
  return (ids ?? []).map((id) => delegateCountry(committee, id)).join(", ");
}

function motionToRow(
  committee: Committee,
  motion: Motion,
  queueLabel: string
): Record<string, unknown> {
  return {
    Queue: queueLabel,
    Timestamp: new Date(motion.timestamp).toLocaleString(),
    Motion: motion.type,
    ProposedBy: delegateCountry(committee, motion.proposedBy),
    Status: motion.status,
    Disruptivity: motion.disruptivity,
    "Votes For": motion.votesFor ?? "",
    "Votes Against": motion.votesAgainst ?? "",
    Abstain: motion.votesAbstain ?? "",
    ...motion.details,
    Notes: motion.notes ?? "",
  };
}

function buildMotionRows(committee: Committee): Record<string, unknown>[] {
  const currentRows = committee.motions.map((m) =>
    motionToRow(committee, m, "Current Queue")
  );

  const archivedRows = (committee.motionQueueHistory ?? []).flatMap((snapshot) =>
    snapshot.motions.map((m) => motionToRow(committee, m, snapshot.label))
  );

  return [...currentRows, ...archivedRows];
}

function buildMotionQueueSummaryRows(
  committee: Committee
): Record<string, unknown>[] {
  const archivedRows = (committee.motionQueueHistory ?? []).map((snapshot) =>
    snapshotToSummaryRow(committee, snapshot)
  );

  if (committee.motions.length === 0) {
    return archivedRows;
  }

  const passedMotion =
    committee.motions.find((m) => m.status === "passed") ?? null;
  const sessionState = passedMotion
    ? committee.motionSessionState?.[passedMotion.id]
    : undefined;

  const activeRow: Record<string, unknown> = {
    Queue: "Current Queue (Active)",
    "Saved At": "",
    "Passed Motion": passedMotion?.type ?? "",
    "Passed By": passedMotion
      ? delegateCountry(committee, passedMotion.proposedBy)
      : "",
    "Speaker List": formatDelegateList(committee, sessionState?.speakerQueue),
    "Speakers For": formatDelegateList(committee, sessionState?.speakersFor),
    "Speakers Against": formatDelegateList(
      committee,
      sessionState?.speakersAgainst
    ),
    "Presentation Delegates": formatDelegateList(
      committee,
      sessionState?.presentationDelegates
    ),
    "QA Delegates": formatDelegateList(committee, sessionState?.qaDelegates),
    "Motion Count": committee.motions.length,
  };

  return [activeRow, ...archivedRows];
}

function snapshotToSummaryRow(
  committee: Committee,
  snapshot: MotionQueueSnapshot
): Record<string, unknown> {
  return {
    Queue: snapshot.label,
    "Saved At": new Date(snapshot.savedAt).toLocaleString(),
    "Passed Motion": snapshot.passedMotion?.type ?? "",
    "Passed By": snapshot.passedMotion
      ? delegateCountry(committee, snapshot.passedMotion.proposedBy)
      : "",
    "Speaker List": formatDelegateList(committee, snapshot.speakerQueue),
    "Speakers For": formatDelegateList(
      committee,
      snapshot.votingSpeakers?.for
    ),
    "Speakers Against": formatDelegateList(
      committee,
      snapshot.votingSpeakers?.against
    ),
    "Presentation Delegates": formatDelegateList(
      committee,
      snapshot.presentationDelegates
    ),
    "QA Delegates": formatDelegateList(committee, snapshot.qaDelegates),
    "Motion Count": snapshot.motions.length,
  };
}

export function exportCommitteeToExcel(committee: Committee) {
  const stats = buildDelegateStats(committee);
  const awards = getAwardPreview(committee);

  const infoRows = [
    {
      Name: committee.name,
      Type: committee.type.toUpperCase(),
      Topic: committee.topic,
      "Discrepancy Threshold": committee.discrepancyThreshold,
      "Require Position Papers": committee.requirePositionPapers ? "Yes" : "No",
      "Verbal Commendation": committee.vcRecipientId
        ? delegateCountry(committee, committee.vcRecipientId)
        : "",
    },
  ];

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

  const motionRows = buildMotionRows(committee);

  const motionQueueRows = buildMotionQueueSummaryRows(committee);

  const speakingRows = committee.speakingEvents.map((e) => ({
    Timestamp: new Date(e.timestamp).toLocaleString(),
    Country: delegateCountry(committee, e.delegateId),
    "Event Type": e.eventType,
    "Duration (sec)": e.durationSeconds ?? "",
    Notes: e.notes ?? "",
  }));

  const pointRows = committee.points.map((p) => ({
    Timestamp: new Date(p.timestamp).toLocaleString(),
    Type: p.type,
    Country: delegateCountry(committee, p.delegateId),
    Description: p.description,
    Resolved: p.resolved ? "Yes" : "No",
  }));

  const documentRows = committee.documents.map((doc) => ({
    Title: doc.title,
    Type: doc.type,
    Status: doc.status,
    Link: doc.link ?? "",
    Sponsors: doc.sponsors
      .map((id) => delegateCountry(committee, id))
      .join(", "),
    Signatories: doc.signatories
      .map((id) => delegateCountry(committee, id))
      .join(", "),
    "Author Panel": doc.authorPanel
      .map((id) => delegateCountry(committee, id))
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
    sheetFromRows(infoRows, "Committee Info"),
    sheetFromRows(delegateRows, "Delegate Stats"),
    sheetFromRows(motionRows, "Motions"),
    sheetFromRows(motionQueueRows, "Motion Queues"),
    sheetFromRows(speakingRows, "Speaking Events"),
    sheetFromRows(pointRows, "Points"),
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

  const motionQueueRows = conference.committees.flatMap((c) =>
    buildMotionQueueSummaryRows(c).map((row) => ({
      Committee: c.name,
      ...row,
    }))
  );

  const motionRows = conference.committees.flatMap((c) =>
    buildMotionRows(c).map((row) => ({
      Committee: c.name,
      ...row,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows),
    "All Committees"
  );

  if (motionQueueRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(motionQueueRows),
      "Motion Queues"
    );
  }

  if (motionRows.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(motionRows),
      "All Motions"
    );
  }

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
