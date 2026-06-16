"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import type { Document, DocumentStatus, DocumentType } from "@/lib/types";

export function DocumentPanel() {
  const {
    activeCommittee,
    addDocument,
    updateDocument,
    promoteToDraftResolution,
  } = useConference();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("working_paper");
  const [content, setContent] = useState("");
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [signatories, setSignatories] = useState<string[]>([]);
  const [authorPanel, setAuthorPanel] = useState<string[]>([]);

  if (!activeCommittee) return null;

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const handleCreate = () => {
    if (!title.trim()) return;
    addDocument({
      title: title.trim(),
      type,
      status: "draft",
      sponsors,
      signatories,
      authorPanel,
      content,
    });
    setTitle("");
    setContent("");
    setSponsors([]);
    setSignatories([]);
    setAuthorPanel([]);
  };

  return (
    <div className="space-y-4">
      <Card title="New Document">
        <p className="mb-3 text-sm text-purple-700">
          Working papers (Rule 12) may only be drafted during unmoderated
          caucuses. Submitting to the dais converts to a draft resolution (Rule
          13).
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as DocumentType)}
            options={[
              { value: "working_paper", label: "Working Paper" },
              { value: "draft_resolution", label: "Draft Resolution" },
            ]}
          />
        </div>
        <div className="mt-3">
          <Textarea
            label="Content / Notes"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
        </div>

        <DelegateMultiSelect
          label="Sponsors (Rule 15)"
          delegates={activeCommittee.delegates}
          selected={sponsors}
          onToggle={(id) => setSponsors(toggleId(sponsors, id))}
        />
        <DelegateMultiSelect
          label="Signatories (Rule 15)"
          delegates={activeCommittee.delegates}
          selected={signatories}
          onToggle={(id) => setSignatories(toggleId(signatories, id))}
        />
        <DelegateMultiSelect
          label="Author's Panel (Rule 14)"
          delegates={activeCommittee.delegates}
          selected={authorPanel}
          onToggle={(id) => setAuthorPanel(toggleId(authorPanel, id))}
        />

        <div className="mt-3">
          <Button onClick={handleCreate}>Create Document</Button>
        </div>
      </Card>

      <Card title="Documents">
        {activeCommittee.documents.length === 0 ? (
          <p className="text-sm text-purple-600">No documents yet.</p>
        ) : (
          <div className="space-y-3">
            {activeCommittee.documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                committee={activeCommittee}
                onUpdate={updateDocument}
                onPromote={promoteToDraftResolution}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function DelegateMultiSelect({
  label,
  delegates,
  selected,
  onToggle,
}: {
  label: string;
  delegates: { id: string; country: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-sm font-medium text-purple-900">{label}</p>
      <div className="flex flex-wrap gap-2">
        {delegates.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onToggle(d.id)}
            className={`rounded-full border px-3 py-1 text-sm ${
              selected.includes(d.id)
                ? "border-purple-700 bg-purple-700 text-white"
                : "border-purple-200 bg-white text-purple-800"
            }`}
          >
            {d.country}
          </button>
        ))}
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  committee,
  onUpdate,
  onPromote,
}: {
  doc: Document;
  committee: NonNullable<ReturnType<typeof useConference>["activeCommittee"]>;
  onUpdate: (d: Document) => void;
  onPromote: (id: string) => void;
}) {
  const country = (ids: string[]) =>
    ids
      .map((id) => committee.delegates.find((d) => d.id === id)?.country ?? id)
      .join(", ");

  const statuses: DocumentStatus[] = [
    "draft",
    "submitted",
    "presented",
    "adopted",
    "failed",
  ];

  return (
    <div className="rounded-md border border-purple-100 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-purple-900">{doc.title}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge color="purple">
              {doc.type === "working_paper" ? "Working Paper" : "Draft Res."}
            </Badge>
            <Badge color="gray">{doc.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-purple-700">
            Sponsors: {country(doc.sponsors) || "None"}
          </p>
          <p className="text-sm text-purple-700">
            Signatories: {country(doc.signatories) || "None"}
          </p>
          <p className="text-sm text-purple-700">
            Author Panel: {country(doc.authorPanel) || "None"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={doc.status === s ? "primary" : "secondary"}
            onClick={() => onUpdate({ ...doc, status: s })}
          >
            {s}
          </Button>
        ))}
        {doc.type === "working_paper" && (
          <Button size="sm" onClick={() => onPromote(doc.id)}>
            Submit to Dais → Draft Resolution
          </Button>
        )}
      </div>
    </div>
  );
}
