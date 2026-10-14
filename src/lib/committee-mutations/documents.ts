import {
  assignSubmissionNumber,
  normalizeDocumentUpdate,
} from "@/lib/documents";
import type { Amendment, Committee, Document } from "@/lib/types";

export function addDocument(committee: Committee, doc: Document): Committee {
  const { committee: withOrder, doc: withSubmission } = assignSubmissionNumber(
    committee,
    doc
  );
  return {
    ...withOrder,
    documents: [withSubmission, ...withOrder.documents],
  };
}

export function updateDocument(committee: Committee, doc: Document): Committee {
  const normalized = normalizeDocumentUpdate(doc);
  return {
    ...committee,
    documents: committee.documents.map((d) =>
      d.id === doc.id ? normalized : d
    ),
  };
}

export function promoteToDraftResolution(
  committee: Committee,
  workingPaperId: string,
  submittedAt: string
): Committee {
  const wp = committee.documents.find((d) => d.id === workingPaperId);
  if (!wp || wp.type !== "working_paper") return committee;

  const promoted: Document = {
    ...wp,
    type: "draft_resolution",
    status: "submitted",
    submittedAt,
    sourceWorkingPaperId: workingPaperId,
  };
  const { committee: withOrder, doc: withSubmission } = assignSubmissionNumber(
    committee,
    promoted
  );

  return {
    ...withOrder,
    documents: withOrder.documents.map((d) =>
      d.id === workingPaperId ? withSubmission : d
    ),
  };
}

export function addAmendment(
  committee: Committee,
  documentId: string,
  amendment: Amendment
): Committee {
  return {
    ...committee,
    documents: committee.documents.map((doc) =>
      doc.id === documentId
        ? { ...doc, amendments: [...doc.amendments, amendment] }
        : doc
    ),
  };
}

export function updateAmendment(
  committee: Committee,
  documentId: string,
  amendment: Amendment
): Committee {
  return {
    ...committee,
    documents: committee.documents.map((doc) =>
      doc.id === documentId
        ? {
            ...doc,
            amendments: doc.amendments.map((a) =>
              a.id === amendment.id ? amendment : a
            ),
          }
        : doc
    ),
  };
}

export function addSponsor(
  committee: Committee,
  documentId: string,
  delegateId: string,
  amendmentId?: string
): Committee {
  return {
    ...committee,
    documents: committee.documents.map((doc) => {
      if (doc.id !== documentId) return doc;
      if (amendmentId) {
        return {
          ...doc,
          amendments: doc.amendments.map((a) => {
            if (a.id !== amendmentId) return a;
            const sponsors = a.sponsors ?? [];
            if (sponsors.includes(delegateId)) return a;
            return { ...a, sponsors: [...sponsors, delegateId] };
          }),
        };
      }
      if (doc.sponsors.includes(delegateId)) return doc;
      return { ...doc, sponsors: [...doc.sponsors, delegateId] };
    }),
  };
}
