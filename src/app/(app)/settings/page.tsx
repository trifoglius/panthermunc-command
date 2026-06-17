"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { useConference } from "@/context/ConferenceContext";
import { usePolling } from "@/hooks/usePolling";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { COMMITTEE_POLL_MS } from "@/lib/sync-constants";
import { exportConferenceLogs } from "@/lib/conference-logs-export";
import { getCommitteeStats } from "@/lib/conference-stats";
import type { Committee } from "@/lib/types";

function ConferenceStatsCard({ committees }: { committees: Committee[] }) {
  if (committees.length === 0) return null;
  return (
    <Card title="Conference Statistics">
      <div className="space-y-4">
        {committees.map((c) => {
          const { presentCount, passedMotions, lastPassedMotion, adoptedResolutions } =
            getCommitteeStats(c);
          return (
            <div
              key={c.id}
              className="rounded-lg border border-purple-100 bg-white p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-purple-900">{c.name}</p>
                <Badge color="purple">{c.type.toUpperCase()}</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div className="rounded-md bg-purple-50 px-3 py-2">
                  <p className="text-xs text-purple-600">Delegates Present</p>
                  <p className="font-bold text-purple-900">
                    {presentCount !== null
                      ? `${presentCount} / ${c.delegates.length}`
                      : "No roll call"}
                  </p>
                </div>
                <div className="rounded-md bg-purple-50 px-3 py-2">
                  <p className="text-xs text-purple-600">Passed Motions</p>
                  <p className="font-bold text-purple-900">{passedMotions}</p>
                </div>
                <div className="rounded-md bg-purple-50 px-3 py-2">
                  <p className="text-xs text-purple-600">Last Passed Motion</p>
                  <p className="truncate font-bold text-purple-900">
                    {lastPassedMotion ? lastPassedMotion.type : "—"}
                  </p>
                </div>
                <div className="rounded-md bg-purple-50 px-3 py-2">
                  <p className="text-xs text-purple-600">Adopted Resolutions</p>
                  <p className="font-bold text-purple-900">{adoptedResolutions}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NotifyChairsCard({ committees }: { committees: Committee[] }) {
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyTarget, setNotifyTarget] = useState<string>("all");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const handleSendNotification = async () => {
    if (!notifyMessage.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const committeeIds =
        notifyTarget === "all" ? null : [notifyTarget];
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: notifyMessage.trim(), committeeIds }),
      });
      if (res.ok) {
        setSendResult("Sent!");
        setNotifyMessage("");
        setNotifyTarget("all");
        setTimeout(() => setSendResult(null), 3000);
      } else {
        setSendResult("Failed to send.");
      }
    } catch {
      setSendResult("Failed to send.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card title="Notify Chairs">
      <p className="mb-3 text-sm text-purple-700">
        Send a message to committee chairs. It appears as a banner on their
        workspace home page.
      </p>
      <div className="grid gap-3">
        <Select
          label="Send to"
          value={notifyTarget}
          onChange={(e) => setNotifyTarget(e.target.value)}
          options={[
            { value: "all", label: "All committees" },
            ...committees.map((c) => ({
              value: c.id,
              label: c.name,
            })),
          ]}
        />
        <Input
          label="Message"
          value={notifyMessage}
          onChange={(e) => setNotifyMessage(e.target.value)}
          placeholder="Type a message for chairs..."
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button
          onClick={handleSendNotification}
          disabled={sending || !notifyMessage.trim()}
        >
          {sending ? "Sending…" : "Send Notification"}
        </Button>
        {sendResult && (
          <span className="text-sm font-medium text-green-700">{sendResult}</span>
        )}
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { allowed, loading: authLoading } = useRequirePermission("conference:manage");
  const {
    conference,
    loading,
    updateConference,
    updateCommittee,
    removeCommittee,
    deleteConference,
    loadAllCommitteeData,
  } = useConference();

  const [draftName, setDraftName] = useState<string | null>(null);
  const [draftYear, setDraftYear] = useState<number | null>(null);
  const [committeeNames, setCommitteeNames] = useState<Record<string, string>>(
    {}
  );
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  usePolling(loadAllCommitteeData, COMMITTEE_POLL_MS, !loading && !!conference);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-purple-800">
        Loading...
      </div>
    );
  }

  if (!allowed || !conference) return null;
  const name = draftName ?? conference.name;
  const year = draftYear ?? conference.year;

  const handleSaveDetails = async () => {
    setSaving(true);
    await updateConference({ name: name.trim() || conference.name, year });
    setDraftName(null);
    setDraftYear(null);
    setSaving(false);
  };

  const handleSaveCommitteeName = (id: string) => {
    const committee = conference.committees.find((c) => c.id === id);
    const newName = committeeNames[id]?.trim();
    if (!committee || !newName || newName === committee.name) return;
    updateCommittee({ ...committee, name: newName });
  };

  const handleRemoveCommittee = async (id: string) => {
    if (conference.committees.length <= 1) {
      if (
        !confirm(
          "This is the last committee. Removing it will return you to setup. Continue?"
        )
      )
        return;
    } else if (
      !confirm(
        "Remove this committee and all of its data? This cannot be undone."
      )
    ) {
      return;
    }
    await removeCommittee(id);
  };

  const handleDeleteConference = async () => {
    if (deleteConfirm !== conference.name) return;
    await deleteConference();
  };

  return (
    <div className="min-h-screen bg-purple-50">
      <Header />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-purple-900">
            Manage Conference
          </h2>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Back to Conference
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card title="Conference Details">
              <div className="grid gap-3">
                <Input
                  label="Conference Name"
                  value={name}
                  onChange={(e) => setDraftName(e.target.value)}
                />
                <Input
                  label="Year"
                  type="number"
                  value={year}
                  onChange={(e) => {
                    const nextYear = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(nextYear) && nextYear > 0) {
                      setDraftYear(nextYear);
                    }
                  }}
                />
                <Button onClick={handleSaveDetails} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </Card>

            <Card title="Committees">
              {conference.committees.length === 0 ? (
                <p className="text-sm text-purple-600">No committees.</p>
              ) : (
                <ul className="space-y-3">
                  {conference.committees.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-end gap-2 border-b border-purple-100 pb-3 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <Input
                          label={c.type.toUpperCase()}
                          value={committeeNames[c.id] ?? c.name}
                          onChange={(e) =>
                            setCommitteeNames((prev) => ({
                              ...prev,
                              [c.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSaveCommitteeName(c.id)}
                      >
                        Save
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRemoveCommittee(c.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Export Logs">
              <p className="mb-3 text-sm text-purple-700">
                Download all motions, speaking events, points, and roll call
                records across every committee.
              </p>
              <Button
                variant="secondary"
                onClick={() => exportConferenceLogs(conference)}
              >
                Export All Conference Logs
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <NotifyChairsCard committees={conference.committees} />

            <ConferenceStatsCard committees={conference.committees} />

            <Card title="Delete Conference">
              <p className="mb-3 text-sm text-red-700">
                Permanently delete this conference and all data. This{" "}
                <strong>cannot</strong> be undone.
              </p>
              <p className="mb-3 text-sm text-red-700">
                It is <strong>highly</strong> recommended to export all data
                before deleting the conference.
              </p>
              {!showDelete ? (
                <Button variant="danger" onClick={() => setShowDelete(true)}>
                  Delete Conference
                </Button>
              ) : (
                <div className="grid gap-3">
                  <p className="text-sm text-gray-700">
                    Type <strong>{conference.name}</strong> to confirm:
                  </p>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={conference.name}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      disabled={deleteConfirm !== conference.name}
                      onClick={handleDeleteConference}
                    >
                      Confirm Delete
                    </Button>
                    <Button variant="ghost" onClick={() => setShowDelete(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
