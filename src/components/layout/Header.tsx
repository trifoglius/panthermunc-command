"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { exportFullConferenceToExcel } from "@/lib/excel-export";
import { Button, Card, Input, Select } from "@/components/ui";
import type { CommitteeType } from "@/lib/types";

export function Header() {
  const { user, logout } = useAuth();
  const { conference, exportJson, createCommittee, activeCommittee } =
    useConference();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CommitteeType>("ga");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);

  // Notification state (admin only)
  const [showNotify, setShowNotify] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyTarget, setNotifyTarget] = useState<string>("all");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const handleSendNotification = async () => {
    if (!notifyMessage.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const committeeIds =
        notifyTarget === "all"
          ? null
          : [notifyTarget];
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

  const handleAddCommittee = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createCommittee(name.trim(), type, topic.trim(), type === "ga");
    } finally {
      setName("");
      setTopic("");
      setCreating(false);
      setShowAdd(false);
    }
  };

  return (
    <header className="border-b border-purple-200 bg-purple-800 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-xl font-bold">PantherMUNC Conference Management System</h1>
          <p className="text-sm text-purple-200">
            {conference
              ? `${conference.name} ${conference.year}`
              : "Conference Management"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {conference && (
            <>
              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAdd(!showAdd)}
                  className="!border-white/30 !text-purple-900"
                >
                  Add Committee
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={exportJson}
                className="!border-white/30 !text-purple-900"
              >
                Backup JSON
              </Button>
              {isAdmin ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => exportFullConferenceToExcel(conference)}
                  className="!border-white/30 !text-purple-900"
                >
                  Export All Excel
                </Button>
              ) : activeCommittee ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    import("@/lib/excel-export").then(({ exportCommitteeToExcel }) =>
                      exportCommitteeToExcel(activeCommittee)
                    );
                  }}
                  className="!border-white/30 !text-purple-900"
                >
                  Export Excel
                </Button>
              ) : null}
              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowNotify(!showNotify);
                    setShowAdd(false);
                  }}
                  className="!border-white/30 !text-purple-900"
                >
                  Notify
                </Button>
              )}
              {isAdmin && (
                <Link href="/settings">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="!border-white/30 !text-purple-900"
                  >
                    Manage Conference
                  </Button>
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin/users">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="!border-white/30 !text-purple-900"
                  >
                    Users
                  </Button>
                </Link>
              )}
            </>
          )}
          {user && (
            <div className="flex items-center gap-2 border-l border-purple-600 pl-2">
              <span className="text-xs text-purple-200">
                {user.displayName}{" "}
                <span className="rounded bg-purple-700 px-1 py-0.5 text-purple-100">
                  {user.role}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="!text-purple-200 hover:!text-white"
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
      {showNotify && isAdmin && conference && (
        <div className="border-t border-purple-700 bg-white px-4 py-4 text-gray-900">
          <div className="mx-auto max-w-3xl">
            <Card title="Send Notification to Chairs">
              <div className="grid gap-3 md:grid-cols-3">
                <Select
                  label="Send to"
                  value={notifyTarget}
                  onChange={(e) => setNotifyTarget(e.target.value)}
                  options={[
                    { value: "all", label: "All committees" },
                    ...conference.committees.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                  ]}
                />
                <div className="md:col-span-2">
                  <Input
                    label="Message"
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="Type a message for chairs..."
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Button
                  onClick={handleSendNotification}
                  disabled={sending || !notifyMessage.trim()}
                >
                  {sending ? "Sending…" : "Send Notification"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowNotify(false)}
                >
                  Cancel
                </Button>
                {sendResult && (
                  <span className="text-sm font-medium text-green-700">
                    {sendResult}
                  </span>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {showAdd && isAdmin && conference && (
        <div className="border-t border-purple-700 bg-white px-4 py-4 text-gray-900">
          <div className="mx-auto max-w-3xl">
            <Card title="New Committee">
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Select
                  label="Type"
                  value={type}
                  onChange={(e) => setType(e.target.value as CommitteeType)}
                  options={[
                    { value: "ga", label: "GA" },
                    { value: "crisis", label: "Crisis" },
                    { value: "specialized", label: "Specialized" },
                  ]}
                />
                <Input
                  label="Topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <div className="flex items-end gap-2">
                  <Button onClick={handleAddCommittee} disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAdd(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </header>
  );
}
