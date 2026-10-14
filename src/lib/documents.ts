import type { Amendment, Committee, Document, DocumentStatus } from "./types";

/** Normalized change clauses, including legacy single `clause` field. */
export function getAmendmentClauses(amendment: Amendment): string[] {
  if (amendment.clauses?.length) {
    return amendment.clauses.map((c) => c.trim()).filter(Boolean);
  }
  if (amendment.clause?.trim()) return [amendment.clause.trim()];
  return [];
}

export function getDocumentTypeLabel(doc: Document): string {
  if (doc.type === "working_paper") return "Working Paper";
  if (doc.type === "resolution") return "Resolution";
  return "Draft Res.";
}

export function getStatusBadgeColor(
  status: DocumentStatus
): "green" | "red" | "gray" {
  if (status === "adopted") return "green";
  if (status === "failed" || status === "withdrawn") return "red";
  return "gray";
}

/** Draft resolutions still eligible for voting or presentation. */
export function isActiveDraftResolution(doc: Document): boolean {
  return (
    doc.type === "draft_resolution" &&
    doc.status !== "adopted" &&
    doc.status !== "failed" &&
    doc.status !== "withdrawn"
  );
}

export function normalizeDocumentUpdate(doc: Document): Document {
  if (doc.status === "adopted") {
    return { ...doc, type: "resolution" };
  }
  return doc;
}

export function assignSubmissionNumber(
  committee: Committee,
  doc: Document
): { committee: Committee; doc: Document } {
  if (doc.type !== "draft_resolution" || doc.submissionNumber !== undefined) {
    return { committee, doc };
  }

  const submissionNumber = (committee.nextDraftSubmissionOrder ?? 0) + 1;
  return {
    committee: { ...committee, nextDraftSubmissionOrder: submissionNumber },
    doc: {
      ...doc,
      submissionNumber,
      submittedAt: doc.submittedAt ?? new Date().toISOString(),
    },
  };
}

export function getDocumentsBySubmissionOrder(committee: Committee): Document[] {
  return committee.documents
    .filter((doc) => doc.submissionNumber !== undefined)
    .sort(
      (a, b) => (a.submissionNumber ?? 0) - (b.submissionNumber ?? 0)
    );
}

export function getSubmissionOrderIds(committee: Committee): string[] {
  return getDocumentsBySubmissionOrder(committee).map((doc) => doc.id);
}
