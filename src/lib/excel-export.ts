import * as XLSX from "xlsx";
import type { Committee, Conference, Motion, MotionQueueSnapshot } from "./types";
import { getAmendmentClauses } from "./documents";
import { buildDelegateStats } from "./delegate-stats";

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
  const session = committee.sessionState;
  const caucus = session?.activeCaucus;
  const vote = session?.voteContext;

  const activeRow: Record<string, unknown> = {
    Queue: "Current Queue (Active)",
    "Saved At": "",
    "Passed Motion": passedMotion?.type ?? "",
    "Passed By": passedMotion
      ? delegateCountry(committee, passedMotion.proposedBy)
      : "",
    "Speaker List": formatDelegateList(
      committee,
      caucus
        ? [...(caucus.completedSpeakers ?? []), ...caucus.speakerQueue]
        : session?.generalDebate.speakerQueue
    ),
    "Speakers For": formatDelegateList(committee, vote?.speakersFor),
    "Speakers Against": formatDelegateList(committee, vote?.speakersAgainst),
    "Presentation Delegates": "",
    "QA Delegates": "",
    "Motion Count": committee.motions.length,
    "Speaking Sec": session?.speakingTime.speakingSec ?? "",
    "Agenda Adopted": session?.agenda.adopted ? "Yes" : "No",
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

  const infoRows = [
    {
      Name: committee.name,
      Type: committee.type.toUpperCase(),
      Topic: committee.topic,
      "Require Position Papers": committee.requirePositionPapers ? "Yes" : "No",
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
    Ruling: p.chairRuling ?? "",
    "Appeal Status": p.appealStatus ?? "",
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
    Amendments: doc.amendments.length,
    "Submitted At": doc.submittedAt
      ? new Date(doc.submittedAt).toLocaleString()
      : "",
  }));

  const amendmentRows = committee.documents.flatMap((doc) =>
    doc.amendments.map((a) => {
      const clauses = getAmendmentClauses(a);
      return {
        "Parent Document": doc.title,
        Title: a.title || clauses[0] || "",
        Status: a.status,
        Sponsors: (a.sponsors ?? [])
          .map((id) => delegateCountry(committee, id))
          .join(", "),
        Clauses: clauses.join("; "),
        Link: a.link ?? "",
      };
    })
  );

  const rollCallRows = committee.rollCalls.flatMap((rc) =>
    committee.delegates.map((d) => ({
      Session: rc.label,
      Timestamp: new Date(rc.timestamp).toLocaleString(),
      Country: d.country,
      Status: rc.attendance[d.id] ?? "absent",
      "Quorum Met": rc.quorumMet ? "Yes" : "No",
    }))
  );

  const wb = XLSX.utils.book_new();
  const sheets = [
    sheetFromRows(infoRows, "Committee Info"),
    sheetFromRows(delegateRows, "Delegate Stats"),
    sheetFromRows(motionRows, "Motions"),
    sheetFromRows(motionQueueRows, "Motion History"),
    sheetFromRows(speakingRows, "Speaking Events"),
    sheetFromRows(pointRows, "Points"),
    sheetFromRows(documentRows, "Proposals"),
    sheetFromRows(amendmentRows, "Amendments"),
    sheetFromRows(rollCallRows, "Attendance"),
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
      Speeches: s.speeches,
      "Speaking Time (sec)": s.totalSpeakingSeconds,
      "Motions Proposed": s.motionsProposed,
      "Docs Sponsored": s.documentsSponsored,
      "Docs Signed": s.documentsSigned,
      "Points Raised": s.pointsRaised,
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
      "Speaking Time (sec)": s.totalSpeakingSeconds,
      Motions: s.motionsProposed,
      Points: s.pointsRaised,
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
