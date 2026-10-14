"use client";

import { useMemo, useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { DelegateMultiSelect } from "@/components/delegates/DelegateMultiSelect";
import { TimerCard } from "@/components/motions/TimerControls";
import { useCountdown } from "@/hooks/useCountdown";
import {
  getAmendmentClauses,
  getDocumentTypeLabel,
  getDocumentsBySubmissionOrder,
  getStatusBadgeColor,
  isActiveDraftResolution,
} from "@/lib/documents";
import { ensureSessionState } from "@/lib/session-state";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import type { Document, DocumentStatus } from "@/lib/types";

export function ProposalsPanel() {
  const {
    activeCommittee,
    addDocument,
    updateDocument,
    promoteToDraftResolution,
    addAmendment,
    updateAmendment,
    addSponsor,
    setFloorAllotment,
    setAmendmentPeriod,
    clearAmendmentPeriod,
    openVote,
    openAmendmentVote,
    addSpeakingEvent,
  } = useConference();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [introDocId, setIntroDocId] = useState<string | null>(null);
  const [introDelegate, setIntroDelegate] = useState("");
  const [introSeconds, setIntroSeconds] = useState("180");
  const [amendDocId, setAmendDocId] = useState("");
  const [amendTitle, setAmendTitle] = useState("");
  const [amendClauses, setAmendClauses] = useState<string[]>([""]);
  const [amendLink, setAmendLink] = useState("");
  const [amendSponsors, setAmendSponsors] = useState<string[]>([]);
  const [amendPeriodMin, setAmendPeriodMin] = useState("15");
  const [joinSponsorId, setJoinSponsorId] = useState("");

  const session = useMemo(
    () =>
      activeCommittee
        ? ensureSessionState(activeCommittee.sessionState, activeCommittee.topic)
        : null,
    [activeCommittee]
  );

  const floor = session?.floorAllotment;
  const floorTimer = useCountdown(floor?.allottedSec ?? 0);
  const amendPeriod = session?.amendmentPeriod;
  const amendTimer = useCountdown(amendPeriod?.totalSec ?? 0);

  if (!activeCommittee || !session) return null;

  const country = (id: string) =>
    activeCommittee.delegates.find((d) => d.id === id)?.country ?? id;

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const handleCreate = () => {
    if (!title.trim()) return;
    addDocument({
      title: title.trim(),
      type: "draft_resolution",
      status: "submitted",
      sponsors,
      signatories: [],
      authorPanel: [],
      content,
      link: link.trim() || undefined,
      submittedAt: new Date().toISOString(),
    });
    setTitle("");
    setContent("");
    setLink("");
    setSponsors([]);
  };

  const startIntroduction = (doc: Document) => {
    if (!introDelegate) return;
    const sec = Number(introSeconds) || 180;
    setFloorAllotment({
      kind: "draft_intro",
      documentId: doc.id,
      delegateId: introDelegate,
      allottedSec: sec,
      startedAt: new Date().toISOString(),
    });
    floorTimer.reset(sec);
    floorTimer.start();
    if (doc.status === "draft" || doc.status === "submitted") {
      updateDocument({ ...doc, status: "presented" });
    }
    setIntroDocId(null);
  };

  const finishIntroduction = () => {
    if (!floor) return;
    addSpeakingEvent({
      delegateId: floor.delegateId,
      eventType: "introduction",
      durationSeconds: Math.max(0, floor.allottedSec - floorTimer.seconds),
      notes: floor.documentId,
    });
    setFloorAllotment(undefined);
    floorTimer.pause();
  };

  const startAmendPeriod = (documentId: string) => {
    const totalSec = (Number(amendPeriodMin) || 15) * 60;
    const endsAt = new Date(Date.now() + totalSec * 1000).toISOString();
    setAmendmentPeriod(documentId, totalSec, true, endsAt);
    amendTimer.reset(totalSec);
    amendTimer.start();
  };

  const createAmendment = () => {
    const clauses = amendClauses.map((c) => c.trim()).filter(Boolean);
    if (!amendDocId || !amendTitle.trim() || clauses.length === 0) return;
    addAmendment(amendDocId, {
      title: amendTitle.trim(),
      clauses,
      link: amendLink.trim() || undefined,
      amendmentType: "unfriendly",
      status: "submitted",
      proposedBy: amendSponsors[0] ?? "",
      sponsors: amendSponsors,
      submittedAt: new Date().toISOString(),
    });
    setAmendTitle("");
    setAmendClauses([""]);
    setAmendLink("");
    setAmendSponsors([]);
  };

  const updateAmendClause = (index: number, value: string) => {
    setAmendClauses((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const addAmendClauseRow = () => {
    setAmendClauses((prev) => [...prev, ""]);
  };

  const removeAmendClauseRow = (index: number) => {
    setAmendClauses((prev) =>
      prev.length <= 1 ? [""] : prev.filter((_, i) => i !== index)
    );
  };

  const ordered = getDocumentsBySubmissionOrder(activeCommittee);
  const drafts = activeCommittee.documents.filter(isActiveDraftResolution);

  return (
    <div className="space-y-4">
      <Card title="Submit draft resolution">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Document link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="mt-3">
          <Textarea
            label="Notes / summary"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
        </div>
        <DelegateMultiSelect
          label="Sponsors"
          delegates={activeCommittee.delegates}
          selected={sponsors}
          onToggle={(id) => setSponsors(toggleId(sponsors, id))}
        />
        <div className="mt-3">
          <Button onClick={handleCreate} disabled={!title.trim()}>
            Submit draft resolution
          </Button>
        </div>
      </Card>

      {floor &&
        (floor.kind === "draft_intro" || floor.kind === "amendment_intro") && (
          <Card title="Introduction floor">
            <p className="mb-2 text-sm text-purple-700">
              {country(floor.delegateId)} introducing{" "}
              {floor.amendmentId ? "amendment" : "draft"}
            </p>
            <TimerCard
              label="Allotted floor"
              seconds={floorTimer.seconds}
              running={floorTimer.running}
              onStart={floorTimer.start}
              onPause={floorTimer.pause}
              onReset={() => floorTimer.reset(floor.allottedSec)}
              onClose={finishIntroduction}
              startLabel="Resume"
            />
            <div className="mt-3">
              <Button onClick={finishIntroduction}>End introduction</Button>
            </div>
          </Card>
        )}

      {amendPeriod?.active && (
        <Card title="Amendment drafting period">
          <p className="mb-2 text-sm text-purple-700">
            Target:{" "}
            {activeCommittee.documents.find((d) => d.id === amendPeriod.documentId)
              ?.title ?? amendPeriod.documentId}
          </p>
          <TimerCard
            label="Amendment period"
            seconds={amendTimer.seconds}
            running={amendTimer.running}
            onStart={amendTimer.start}
            onPause={amendTimer.pause}
            onReset={() => amendTimer.reset(amendPeriod.totalSec)}
            startLabel="Resume"
          />
          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => {
                clearAmendmentPeriod();
                amendTimer.pause();
              }}
            >
              End amendment period
            </Button>
          </div>
        </Card>
      )}

      <Card title="Proposals">
        <div className="mb-4 max-w-[12rem]">
          <Input
            label="Amendment period (min)"
            value={amendPeriodMin}
            onChange={(e) => setAmendPeriodMin(e.target.value)}
          />
        </div>
        {activeCommittee.documents.length === 0 ? (
          <p className="text-sm text-purple-600">No proposals yet.</p>
        ) : (
          <div className="space-y-4">
            {(ordered.length > 0
              ? ordered
              : activeCommittee.documents
            ).map((doc) => (
              <div
                key={doc.id}
                className="rounded-lg border border-purple-100 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-purple-900">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-purple-600">
                      {getDocumentTypeLabel(doc)}
                      {doc.submissionNumber
                        ? ` · #${doc.submissionNumber}`
                        : ""}
                    </p>
                  </div>
                  <Badge color={getStatusBadgeColor(doc.status)}>
                    {doc.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-purple-700">
                  Sponsors:{" "}
                  {doc.sponsors.map(country).join(", ") || "—"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {doc.type === "working_paper" && (
                    <Button
                      size="sm"
                      onClick={() => promoteToDraftResolution(doc.id)}
                    >
                      Promote to draft resolution
                    </Button>
                  )}
                  {isActiveDraftResolution(doc) && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setIntroDocId(doc.id)}
                      >
                        Introduce
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => startAmendPeriod(doc.id)}
                      >
                        Amendment period
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const competence =
                            session.voteContext?.competence;
                          if (
                            competence?.documentId === doc.id &&
                            competence.status === "pending"
                          ) {
                            return;
                          }
                          if (
                            competence?.documentId === doc.id &&
                            competence.status === "not_competent"
                          ) {
                            return;
                          }
                          openVote(doc.id, "recorded");
                        }}
                      >
                        Open vote
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateDocument({ ...doc, status: "withdrawn" })
                        }
                      >
                        Withdraw
                      </Button>
                    </>
                  )}
                  <Select
                    label=""
                    aria-label="Status"
                    value={doc.status}
                    onChange={(e) =>
                      updateDocument({
                        ...doc,
                        status: e.target.value as DocumentStatus,
                      })
                    }
                    options={[
                      { value: "draft", label: "Draft" },
                      { value: "submitted", label: "Submitted" },
                      { value: "presented", label: "Presented" },
                      { value: "adopted", label: "Adopted" },
                      { value: "failed", label: "Failed" },
                      { value: "withdrawn", label: "Withdrawn" },
                    ]}
                    className="max-w-[10rem]"
                  />
                </div>

                {introDocId === doc.id && (
                  <div className="mt-3 grid gap-2 rounded bg-purple-50 p-3 md:grid-cols-3">
                    <Select
                      label="Sponsor to introduce"
                      value={introDelegate}
                      onChange={(e) => setIntroDelegate(e.target.value)}
                      options={[
                        { value: "", label: "Select..." },
                        ...doc.sponsors.map((id) => ({
                          value: id,
                          label: country(id),
                        })),
                        ...activeCommittee.delegates
                          .filter((d) => !doc.sponsors.includes(d.id))
                          .map((d) => ({
                            value: d.id,
                            label: d.country,
                          })),
                      ]}
                    />
                    <Input
                      label="Floor time (sec)"
                      value={introSeconds}
                      onChange={(e) => setIntroSeconds(e.target.value)}
                    />
                    <div className="flex items-end gap-2">
                      <Button
                        onClick={() => startIntroduction(doc)}
                        disabled={!introDelegate}
                      >
                        Start intro
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setIntroDocId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {doc.status === "presented" && (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <Select
                      label="Add sponsor"
                      value={joinSponsorId}
                      onChange={(e) => setJoinSponsorId(e.target.value)}
                      options={[
                        { value: "", label: "Select..." },
                        ...activeCommittee.delegates
                          .filter((d) => !doc.sponsors.includes(d.id))
                          .map((d) => ({
                            value: d.id,
                            label: d.country,
                          })),
                      ]}
                      className="min-w-[10rem]"
                    />
                    <Button
                      size="sm"
                      disabled={!joinSponsorId}
                      onClick={() => {
                        addSponsor(doc.id, joinSponsorId);
                        setJoinSponsorId("");
                      }}
                    >
                      Join as sponsor
                    </Button>
                  </div>
                )}

                {doc.amendments.length > 0 && (
                  <div className="mt-4 border-t border-purple-100 pt-3">
                    <p className="mb-2 text-sm font-semibold text-purple-900">
                      Amendments
                    </p>
                    <ul className="space-y-2">
                      {doc.amendments.map((a) => {
                        const clauses = getAmendmentClauses(a);
                        return (
                          <li
                            key={a.id}
                            className="rounded border border-purple-50 p-2 text-sm"
                          >
                            <div className="flex flex-wrap justify-between gap-2">
                              <span className="font-medium text-purple-900">
                                {a.title || clauses[0] || "Amendment"}
                              </span>
                              <Badge color="gray">{a.status}</Badge>
                            </div>
                            {clauses.length > 0 && (
                              <ol className="mt-1 list-decimal pl-5 text-purple-700">
                                {clauses.map((c, i) => (
                                  <li key={`${a.id}-clause-${i}`}>{c}</li>
                                ))}
                              </ol>
                            )}
                            {a.link && (
                              <p className="mt-1">
                                <a
                                  href={a.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-purple-700 underline"
                                >
                                  Amendment document
                                </a>
                              </p>
                            )}
                            <p className="text-purple-600">
                              Sponsors:{" "}
                              {(a.sponsors ?? []).map(country).join(", ") || "—"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  const sponsor =
                                    (a.sponsors ?? [])[0] || a.proposedBy;
                                  if (!sponsor) return;
                                  const sec = 120;
                                  setFloorAllotment({
                                    kind: "amendment_intro",
                                    documentId: doc.id,
                                    amendmentId: a.id,
                                    delegateId: sponsor,
                                    allottedSec: sec,
                                    startedAt: new Date().toISOString(),
                                  });
                                  updateAmendment(doc.id, {
                                    ...a,
                                    status: "presented",
                                  });
                                  floorTimer.reset(sec);
                                  floorTimer.start();
                                }}
                              >
                                Introduce
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  openAmendmentVote(doc.id, a.id, "recorded")
                                }
                              >
                                Open vote
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateAmendment(doc.id, {
                                    ...a,
                                    status: "withdrawn",
                                  })
                                }
                              >
                                Withdraw
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Submit amendment">
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Target draft resolution"
            value={amendDocId}
            onChange={(e) => setAmendDocId(e.target.value)}
            options={[
              { value: "", label: "Select..." },
              ...drafts.map((d) => ({ value: d.id, label: d.title })),
            ]}
          />
          <Input
            label="Amendment title"
            value={amendTitle}
            onChange={(e) => setAmendTitle(e.target.value)}
          />
          <Input
            label="Amendment link"
            type="url"
            value={amendLink}
            onChange={(e) => setAmendLink(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-purple-900">
            Change clauses / operatives
          </p>
          <p className="text-xs text-purple-600">
            List each change separately so division of the question can use these
            as parts.
          </p>
          {amendClauses.map((clause, index) => (
            <div key={`amend-clause-${index}`} className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  label=""
                  aria-label={`Change clause ${index + 1}`}
                  value={clause}
                  onChange={(e) => updateAmendClause(index, e.target.value)}
                  placeholder={`Clause / operative ${index + 1}`}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAmendClauseRow(index)}
                  disabled={amendClauses.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={addAmendClauseRow}
          >
            Add clause
          </Button>
        </div>
        <DelegateMultiSelect
          label="Sponsors"
          delegates={activeCommittee.delegates}
          selected={amendSponsors}
          onToggle={(id) => setAmendSponsors(toggleId(amendSponsors, id))}
        />
        <div className="mt-3">
          <Button
            onClick={createAmendment}
            disabled={
              !amendDocId ||
              !amendTitle.trim() ||
              !amendClauses.some((c) => c.trim())
            }
          >
            Submit amendment
          </Button>
        </div>
      </Card>
    </div>
  );
}
