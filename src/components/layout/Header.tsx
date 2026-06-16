"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { exportFullConferenceToExcel } from "@/lib/excel-export";
import { hasPermission } from "@/lib/permissions";
import { Button, Card, Input, Select } from "@/components/ui";
import type { CommitteeType } from "@/lib/types";

export function Header() {
  const { user, logout, authLoading } = useAuth();
  const { conference, createCommittee, activeCommittee } = useConference();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CommitteeType>("ga");
  const [topic, setTopic] = useState("");
  const [creating, setCreating] = useState(false);

  const canManageConference = user ? hasPermission(user, "conference:manage") : false;
  const canManageUsers = user ? hasPermission(user, "users:manage") : false;
  const canExportAll = user ? hasPermission(user, "export:all") : false;

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
              {canManageConference && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAdd(!showAdd)}
                  className="!border-white/30 !text-purple-900"
                >
                  Add Committee
                </Button>
              )}
              {canExportAll ? (
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
              {canManageConference && (
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
              {canManageUsers && (
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
          {!authLoading && (
            <div
              className={`flex items-center gap-2 ${user ? "border-l border-purple-600 pl-2" : ""}`}
            >
              {user && (
                <span className="text-xs text-purple-200">
                  {user.displayName}{" "}
                  <span className="rounded bg-purple-700 px-1 py-0.5 text-purple-100">
                    {user.role}
                  </span>
                </span>
              )}
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

      {showAdd && canManageConference && conference && (
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
