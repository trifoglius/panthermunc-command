"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { buildDelegateStats } from "@/lib/delegate-stats";
import { Button, Card, Input, Select, Table, useToast } from "@/components/ui";

export function StatsPanel() {
  const { activeCommittee, addSpeakingEvent } = useConference();
  const { success } = useToast();
  const [speakerId, setSpeakerId] = useState("");
  const [eventType, setEventType] = useState("gsl");
  const [duration, setDuration] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!activeCommittee) return null;

  const stats = buildDelegateStats(activeCommittee);

  const logSpeech = () => {
    if (!speakerId) return;
    addSpeakingEvent({
      delegateId: speakerId,
      eventType,
      durationSeconds: duration ? Number(duration) : undefined,
    });
    success("Speaking event logged");
    setDuration("");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-purple-700">
        Delegate statistics. Export committee or conference data from the Export
        menu in the header.
      </p>

      <Card title="Manual Speaking Event">
        <p className="mb-3 text-sm text-purple-700">
          Moderated caucuses and speakers lists log speeches automatically from
          the Motions tab. Use this for other speaking events.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            label="Delegate"
            value={speakerId}
            onChange={(e) => setSpeakerId(e.target.value)}
            options={[
              { value: "", label: "Select..." },
              ...activeCommittee.delegates.map((d) => ({
                value: d.id,
                label: d.country,
              })),
            ]}
          />
          <Select
            label="Event Type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            options={[
              { value: "gsl", label: "General Speakers List" },
              { value: "moderated_caucus", label: "Moderated Caucus" },
              { value: "round_robin", label: "Round Robin" },
              { value: "presentation", label: "Presentation" },
              { value: "qa", label: "Q&A" },
              { value: "yield", label: "Yield" },
            ]}
          />
          <Input
            label="Duration (seconds)"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
          <div className="flex items-end">
            <Button onClick={logSpeech} disabled={!speakerId}>
              Log Speech
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Delegate Statistics">
        <div className="space-y-3 md:hidden">
          {stats.map((s) => (
            <div
              key={s.delegateId}
              className="rounded-md border border-purple-100 p-3 text-sm"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() =>
                  setExpandedId((id) =>
                    id === s.delegateId ? null : s.delegateId
                  )
                }
              >
                <span className="font-medium text-purple-900">{s.country}</span>
                <span className="text-purple-700">{s.speeches} speeches</span>
              </button>
              {expandedId === s.delegateId && (
                <dl className="mt-2 grid grid-cols-2 gap-1 text-xs text-purple-700">
                  <dt>Speeches</dt>
                  <dd>{s.speeches}</dd>
                  <dt>Time (s)</dt>
                  <dd>{s.totalSpeakingSeconds}</dd>
                  <dt>Motions</dt>
                  <dd>{s.motionsProposed}</dd>
                  <dt>Sponsored</dt>
                  <dd>{s.documentsSponsored}</dd>
                  <dt>Signed</dt>
                  <dd>{s.documentsSigned}</dd>
                  <dt>Points</dt>
                  <dd>{s.pointsRaised}</dd>
                </dl>
              )}
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table stickyFirstColumn compact>
            <thead>
              <tr className="border-b border-purple-100 text-purple-800">
                <th className="pb-2 pr-3">Country</th>
                <th className="pb-2 pr-3">Speeches</th>
                <th className="pb-2 pr-3">Time (s)</th>
                <th className="pb-2 pr-3">Motions</th>
                <th className="pb-2 pr-3">Sponsored</th>
                <th className="pb-2 pr-3">Signed</th>
                <th className="pb-2">Points</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.delegateId} className="border-b border-purple-50">
                  <td className="py-2 pr-3 font-medium">{s.country}</td>
                  <td className="py-2 pr-3">{s.speeches}</td>
                  <td className="py-2 pr-3">{s.totalSpeakingSeconds}</td>
                  <td className="py-2 pr-3">{s.motionsProposed}</td>
                  <td className="py-2 pr-3">{s.documentsSponsored}</td>
                  <td className="py-2 pr-3">{s.documentsSigned}</td>
                  <td className="py-2">{s.pointsRaised}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
