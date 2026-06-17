import {
  assignSubmissionNumber,
  normalizeDocumentUpdate,
} from "@/lib/documents";
import type { Committee, Document } from "@/lib/types";

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
