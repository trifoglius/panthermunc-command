import * as XLSX from "xlsx";
import type { Committee, Conference } from "./types";

function appendCommitteeLogs(committee: Committee) {
  const motionRows = [
    ...committee.motions,
    ...(committee.motionQueueHistory ?? []).flatMap((s) => s.motions),
  ].map((m) => {
    const proposer = committee.delegates.find((d) => d.id === m.proposedBy);
    return {
      Committee: committee.name,
      Timestamp: new Date(m.timestamp).toLocaleString(),
      Type: "Motion",
      Event: m.type,
      Actor: proposer?.country ?? m.proposedBy,
      Status: m.status,
      Details: m.notes ?? "",
    };
  });

  const speakingRows = committee.speakingEvents.map((e) => {
    const delegate = committee.delegates.find((d) => d.id === e.delegateId);
    return {
      Committee: committee.name,
      Timestamp: new Date(e.timestamp).toLocaleString(),
      Type: "Speaking",
      Event: e.eventType,
      Actor: delegate?.country ?? e.delegateId,
      Status: e.durationSeconds != null ? `${e.durationSeconds}s` : "",
      Details: e.notes ?? "",
    };
  });

  const pointRows = committee.points.map((p) => {
    const delegate = committee.delegates.find((d) => d.id === p.delegateId);
    return {
      Committee: committee.name,
      Timestamp: new Date(p.timestamp).toLocaleString(),
      Type: "Point",
      Event: p.type,
      Actor: delegate?.country ?? p.delegateId,
      Status: p.resolved ? "Resolved" : "Open",
      Details: p.description,
    };
  });

  const rollCallRows = committee.rollCalls.map((rc) => ({
    Committee: committee.name,
    Timestamp: new Date(rc.timestamp).toLocaleString(),
    Type: "Roll Call",
    Event: rc.label,
    Actor: "",
    Status: rc.quorumMet ? "Quorum Met" : "No Quorum",
    Details: `${Object.values(rc.attendance).filter((s) => s !== "absent").length} present`,
  }));

  return [...motionRows, ...speakingRows, ...pointRows, ...rollCallRows];
}

export function exportConferenceLogs(conference: Conference): void {
  const allRows = conference.committees.flatMap(appendCommitteeLogs);
  allRows.sort(
    (a, b) =>
      new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(allRows),
    "Conference Logs"
  );

  conference.committees.forEach((c) => {
    const rows = appendCommitteeLogs(c);
    rows.sort(
      (a, b) =>
        new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
    );
    const safeName = c.name.slice(0, 31).replace(/[\\/?*[\]]/g, "");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows),
      safeName
    );
  });

  XLSX.writeFile(
    wb,
    `PantherMUNC_${conference.year}_Logs.xlsx`
  );
}
