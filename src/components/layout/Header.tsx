"use client";

import Link from "next/link";
import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { exportFullConferenceToExcel } from "@/lib/excel-export";
import { Button, Card, Input, Select } from "@/components/ui";
import type { CommitteeType } from "@/lib/types";

export function Header() {
  const { conference, exportJson, createCommittee } = useConference();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CommitteeType>("ga");
  const [topic, setTopic] = useState("");

  const handleAddCommittee = () => {
    if (!name.trim()) return;
    createCommittee(name.trim(), type, topic.trim(), type === "ga");
    setName("");
    setTopic("");
    setShowAdd(false);
  };

  return (
    <header className="border-b border-purple-200 bg-purple-800 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-xl font-bold">PantherMUNC Command</h1>
          <p className="text-sm text-purple-200">
            {conference
              ? `${conference.name} ${conference.year}`
              : "Conference Management"}
          </p>
        </div>
        <div className="flex gap-2">
          {conference && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAdd(!showAdd)}
                className="!border-white/30 !text-purple-900"
              >
                Add Committee
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={exportJson}
                className="!border-white/30 !text-purple-900"
              >
                Backup JSON
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => exportFullConferenceToExcel(conference)}
                className="!border-white/30 !text-purple-900"
              >
                Export All Excel
              </Button>
              <Link href="/settings">
                <Button
                  variant="secondary"
                  size="sm"
                  className="!border-white/30 !text-purple-900"
                >
                  Manage Conference
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
      {showAdd && conference && (
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
                  <Button onClick={handleAddCommittee}>Create</Button>
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
