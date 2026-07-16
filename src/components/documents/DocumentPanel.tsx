"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { DelegateMultiSelect } from "@/components/delegates/DelegateMultiSelect";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import {
  getDocumentTypeLabel,
  getDocumentsBySubmissionOrder,
  getStatusBadgeColor,
} from "@/lib/documents";
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
  const [link, setLink] = useState("");
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [signatories, setSignatories] = useState<string[]>([]);
  const [authorPanel, setAuthorPanel] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  if (!activeCommittee) return null;

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const handleCreate = () => {
    if (!title.trim() || creating) return;
    setCreating(true);
    addDocument({
      title: title.trim(),
      type,
      status: "draft",
      sponsors,
      signatories,
      authorPanel,
      content,
      link: link.trim() || undefined,
    });
    setTitle("");
    setContent("");
    setLink("");
    setSponsors([]);
    setSignatories([]);
    setAuthorPanel([]);
    setTimeout(() => setCreating(false), 500);
  };

  return (
    <div className="space-y-4">
      <Card title="New Document">
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
          <Input
            label="Document Link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://docs.google.com/..."
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
          label="Sponsors"
          delegates={activeCommittee.delegates}
          selected={sponsors}
          onToggle={(id) => setSponsors(toggleId(sponsors, id))}
        />
        <DelegateMultiSelect
          label="Signatories"
          delegates={activeCommittee.delegates}
          selected={signatories}
          onToggle={(id) => setSignatories(toggleId(signatories, id))}
        />
        <DelegateMultiSelect
          label="Author's Panel"
          delegates={activeCommittee.delegates}
          selected={authorPanel}
          onToggle={(id) => setAuthorPanel(toggleId(authorPanel, id))}
        />

        <div className="mt-3">
          <Button onClick={handleCreate} disabled={creating}>
            Create Document
          </Button>
        </div>
      </Card>

      {getDocumentsBySubmissionOrder(activeCommittee).length > 0 && (
        <Card title="Order Received by Dais">
          <p className="mb-3 text-sm text-purple-700">
            Draft resolutions in the order they were submitted to the dais. Use
            this when presenting or voting on papers in order received.
          </p>
          <ol className="space-y-2">
            {getDocumentsBySubmissionOrder(activeCommittee).map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-purple-100 px-3 py-2"
              >
                <span className="text-sm text-purple-900">
                  <span className="mr-2 font-medium text-purple-600">
                    {doc.submissionNumber}.
                  </span>
                  {doc.title}
                </span>
                <Badge color="purple">{getDocumentTypeLabel(doc)}</Badge>
              </li>
            ))}
          </ol>
        </Card>
      )}

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
  const [editing, setEditing] = useState(false);
  const [sponsors, setSponsors] = useState(doc.sponsors);
  const [signatories, setSignatories] = useState(doc.signatories);
  const [authorPanel, setAuthorPanel] = useState(doc.authorPanel);
  const [promoting, setPromoting] = useState(false);

  const handlePromote = () => {
    if (promoting) return;
    setPromoting(true);
    onPromote(doc.id);
    setTimeout(() => setPromoting(false), 500);
  };

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

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

  const startEditing = () => {
    setSponsors(doc.sponsors);
    setSignatories(doc.signatories);
    setAuthorPanel(doc.authorPanel);
    setEditing(true);
  };

  const saveEditing = () => {
    onUpdate({ ...doc, sponsors, signatories, authorPanel });
    setEditing(false);
  };

  return (
    <div className="rounded-md border border-purple-100 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-purple-900">{doc.title}</p>
          {doc.submissionNumber !== undefined && (
            <p className="text-xs text-purple-600">
              Received #{doc.submissionNumber}
              {doc.submittedAt
                ? ` · ${new Date(doc.submittedAt).toLocaleString()}`
                : ""}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge color="purple">{getDocumentTypeLabel(doc)}</Badge>
            <Badge color={getStatusBadgeColor(doc.status)}>{doc.status}</Badge>
          </div>
          {!editing && (
            <>
              <p className="mt-1 text-sm text-purple-700">
                Sponsors: {country(doc.sponsors) || "None"}
              </p>
              <p className="text-sm text-purple-700">
                Signatories: {country(doc.signatories) || "None"}
              </p>
              <p className="text-sm text-purple-700">
                Author Panel: {country(doc.authorPanel) || "None"}
              </p>
            </>
          )}
          {doc.link && (
            <p className="text-sm">
              <a
                href={doc.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-700 underline hover:text-purple-900"
              >
                Open Document
              </a>
            </p>
          )}
        </div>
        {!editing && (
          <Button size="sm" variant="secondary" onClick={startEditing}>
            Edit Delegates
          </Button>
        )}
      </div>

      {editing && (
        <div className="mt-3 rounded-md border border-purple-100 bg-purple-50/50 p-3">
          <DelegateMultiSelect
            label="Sponsors"
            delegates={committee.delegates}
            selected={sponsors}
            onToggle={(id) => setSponsors(toggleId(sponsors, id))}
          />
          <DelegateMultiSelect
            label="Signatories"
            delegates={committee.delegates}
            selected={signatories}
            onToggle={(id) => setSignatories(toggleId(signatories, id))}
          />
          <DelegateMultiSelect
            label="Author's Panel"
            delegates={committee.delegates}
            selected={authorPanel}
            onToggle={(id) => setAuthorPanel(toggleId(authorPanel, id))}
          />
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={saveEditing}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-2">
        <Input
          label="Document Link"
          type="url"
          value={doc.link ?? ""}
          onChange={(e) =>
            onUpdate({ ...doc, link: e.target.value.trim() || undefined })
          }
          placeholder="https://..."
          className="mb-2"
        />
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
          <Button size="sm" onClick={handlePromote} disabled={promoting}>
            Submit to Dais → Draft Resolution
          </Button>
        )}
      </div>
    </div>
  );
}
