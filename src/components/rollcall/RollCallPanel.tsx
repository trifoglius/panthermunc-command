"use client";

import { useMemo, useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import type { RollCallStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: RollCallStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "present_voting", label: "Present & Voting" },
  { value: "absent", label: "Absent" },
];

export function RollCallPanel() {
  const {
    activeCommittee,
    startRollCall,
    updateRollCallStatus,
  } = useConference();
  const [label, setLabel] = useState("Opening Roll Call");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    activeCommittee?.rollCalls[0]?.id ?? null
  );
  const [absentOnly, setAbsentOnly] = useState(false);

  const session =
    activeCommittee?.rollCalls.find((r) => r.id === activeSessionId) ??
    activeCommittee?.rollCalls[0];

  const visibleDelegates = useMemo(() => {
    if (!activeCommittee || !session) return [];
    if (!absentOnly) return activeCommittee.delegates;
    return activeCommittee.delegates.filter(
      (d) => (session.attendance[d.id] ?? "absent") === "absent"
    );
  }, [activeCommittee, session, absentOnly]);

  if (!activeCommittee) return null;

  const handleStart = () => {
    const id = startRollCall(label || "Roll Call");
    setActiveSessionId(id);
  };

  const markAllPresent = () => {
    if (!session) return;
    for (const d of activeCommittee.delegates) {
      updateRollCallStatus(session.id, d.id, "present");
    }
  };

  const presentCount = session
    ? Object.values(session.attendance).filter(
        (s) => s === "present" || s === "present_voting"
      ).length
    : 0;

  return (
    <div className="space-y-4">
      <Card title="Roll Call">
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Session Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleStart}>Start New Roll Call</Button>
        </div>
      </Card>

      {activeCommittee.rollCalls.length > 0 && (
        <Card title="Roll Call Sessions">
          <div className="mb-4 flex flex-wrap gap-2">
            {activeCommittee.rollCalls.map((rc) => (
              <Button
                key={rc.id}
                variant={session?.id === rc.id ? "primary" : "secondary"}
                size="sm"
                onClick={() => setActiveSessionId(rc.id)}
              >
                {rc.label}
              </Button>
            ))}
          </div>

          {session && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Badge color={session.quorumMet ? "green" : "red"}>
                  Quorum: {session.quorumMet ? "Met" : "Not Met"}
                </Badge>
                <Badge color="purple">
                  Present: {presentCount} / {activeCommittee.delegates.length}
                </Badge>
                <span className="text-sm text-purple-600">
                  {new Date(session.timestamp).toLocaleString()}
                </span>
                <Button variant="secondary" size="sm" onClick={markAllPresent}>
                  Mark all present
                </Button>
                <label className="flex items-center gap-2 text-sm text-purple-800">
                  <input
                    type="checkbox"
                    checked={absentOnly}
                    onChange={(e) => setAbsentOnly(e.target.checked)}
                    className="rounded border-purple-300 text-purple-700"
                  />
                  Show absent only
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visibleDelegates.map((d) => {
                  const status = session.attendance[d.id] ?? "absent";
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-md border border-purple-100 p-2"
                    >
                      <span className="font-medium text-purple-900">
                        {d.country}
                      </span>
                      <Select
                        label=""
                        aria-label={`Attendance for ${d.country}`}
                        value={status}
                        onChange={(e) =>
                          updateRollCallStatus(
                            session.id,
                            d.id,
                            e.target.value as RollCallStatus
                          )
                        }
                        options={STATUS_OPTIONS}
                        className="max-w-[10rem]"
                      />
                    </div>
                  );
                })}
              </div>
              {absentOnly && visibleDelegates.length === 0 && (
                <p className="text-sm text-green-700">All delegates are present.</p>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
