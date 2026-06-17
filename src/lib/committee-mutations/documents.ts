import type { Committee, Document } from "@/lib/types";

export function addDocument(committee: Committee, doc: Document): Committee {
  return { ...committee, documents: [doc, ...committee.documents] };
}

export function updateDocument(committee: Committee, doc: Document): Committee {
  return {
    ...committee,
    documents: committee.documents.map((d) => (d.id === doc.id ? doc : d)),
  };
}

export function promoteToDraftResolution(
  committee: Committee,
  workingPaperId: string,
  submittedAt: string
): Committee {
  const wp = committee.documents.find((d) => d.id === workingPaperId);
  if (!wp || wp.type !== "working_paper") return committee;
  return {
    ...committee,
    documents: committee.documents.map((d) =>
      d.id === workingPaperId
        ? {
            ...d,
            type: "draft_resolution" as const,
            status: "submitted" as const,
            submittedAt,
          }
        : d
    ),
  };
}
