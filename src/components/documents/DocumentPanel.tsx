"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { DelegateMultiSelect } from "@/components/delegates/DelegateMultiSelect";
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
  const [link, setLink] = useState("");
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
      link: link.trim() || undefined,
    });
    setTitle("");
    setContent("");
    setLink("");
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
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge color="purple">
              {doc.type === "working_paper" ? "Working Paper" : "Draft Res."}
            </Badge>
            <Badge color="gray">{doc.status}</Badge>
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
            label="Sponsors (Rule 15)"
            delegates={committee.delegates}
            selected={sponsors}
            onToggle={(id) => setSponsors(toggleId(sponsors, id))}
          />
          <DelegateMultiSelect
            label="Signatories (Rule 15)"
            delegates={committee.delegates}
            selected={signatories}
            onToggle={(id) => setSignatories(toggleId(signatories, id))}
          />
          <DelegateMultiSelect
            label="Author's Panel (Rule 14)"
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
          <Button size="sm" onClick={() => onPromote(doc.id)}>
            Submit to Dais → Draft Resolution
          </Button>
        )}
      </div>
    </div>
  );
}
