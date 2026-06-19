"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { buildDelegateStats, getAwardPreview } from "@/lib/scoring";
import { Badge, Button, Card, Input, Select, Table, useToast } from "@/components/ui";

export function StatsPanel() {
  const { activeCommittee, addSpeakingEvent } = useConference();
  const { success } = useToast();
  const [speakerId, setSpeakerId] = useState("");
  const [eventType, setEventType] = useState("gsl");
  const [duration, setDuration] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!activeCommittee) return null;

  const stats = buildDelegateStats(activeCommittee);
  const awards = getAwardPreview(activeCommittee);

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
        Awards preview and delegate statistics. Export committee or conference
        data from the Export menu in the header.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Awards Preview">
          <div className="space-y-2 text-sm">
            <AwardRow
              label="Best Delegate"
              country={awards.bestDelegate?.country}
              name={awards.bestDelegate?.delegateName}
              score={awards.bestDelegate?.compositeScore}
            />
            <AwardRow
              label="Outstanding Delegate"
              country={awards.outstandingDelegate?.country}
              name={awards.outstandingDelegate?.delegateName}
              score={awards.outstandingDelegate?.compositeScore}
            />
            <AwardRow
              label="Honorable Delegate"
              country={awards.honorableDelegate?.country}
              name={awards.honorableDelegate?.delegateName}
              score={awards.honorableDelegate?.compositeScore}
            />
            <AwardRow
              label="Verbal Commendation"
              country={awards.verbalCommendation?.country}
              name={awards.verbalCommendation?.delegateName}
            />
            <AwardRow
              label="Position Paper"
              country={awards.positionPaper?.country}
              name={awards.positionPaper?.delegateName}
              score={awards.positionPaper?.positionPaperScore}
            />
          </div>
        </Card>

        <Card title="Special Circumstances">
          {awards.specialCircumstances.length === 0 ? (
            <p className="text-sm text-green-700">No issues detected.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {awards.specialCircumstances.map((s) => (
                <li
                  key={s.delegateId}
                  className="rounded border border-yellow-200 bg-yellow-50 p-2"
                >
                  <strong>{s.country}</strong>: {s.specialCircumstance}
                  {s.absoluteDifference !== undefined && (
                    <> (diff: {s.absoluteDifference})</>
                  )}
                </li>
              ))}
            </ul>
          )}
          {awards.noPositionPaper.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-purple-900">
                No Position Paper:
              </p>
              <p className="text-sm text-purple-700">
                {awards.noPositionPaper.map((s) => s.country).join(", ")}
              </p>
            </div>
          )}
        </Card>
      </div>

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
                <span className="font-medium text-purple-900">
                  #{s.rank ?? "—"} {s.country}
                </span>
                <span className="font-semibold text-purple-700">
                  {s.compositeScore?.toFixed(1) ?? "—"}
                </span>
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
                  <dt>Judge</dt>
                  <dd>{s.judgeScore ?? "—"}</dd>
                  <dt>Dais</dt>
                  <dd>{s.daisScore ?? "—"}</dd>
                </dl>
              )}
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table stickyFirstColumn compact>
            <thead>
              <tr className="border-b border-purple-100 text-purple-800">
                <th className="pb-2 pr-3">Rank</th>
                <th className="pb-2 pr-3">Country</th>
                <th className="hidden pb-2 pr-3 lg:table-cell">Speeches</th>
                <th className="hidden pb-2 pr-3 lg:table-cell">Time (s)</th>
                <th className="hidden pb-2 pr-3 xl:table-cell">Motions</th>
                <th className="hidden pb-2 pr-3 xl:table-cell">Sponsored</th>
                <th className="hidden pb-2 pr-3 xl:table-cell">Signed</th>
                <th className="hidden pb-2 pr-3 xl:table-cell">Points</th>
                <th className="pb-2 pr-3">Judge</th>
                <th className="pb-2 pr-3">Dais</th>
                <th className="pb-2 pr-3">Composite</th>
                <th className="pb-2">Alert</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.delegateId} className="border-b border-purple-50">
                  <td className="py-2 pr-3">{s.rank ?? "—"}</td>
                  <td className="py-2 pr-3 font-medium">{s.country}</td>
                  <td className="hidden py-2 pr-3 lg:table-cell">{s.speeches}</td>
                  <td className="hidden py-2 pr-3 lg:table-cell">
                    {s.totalSpeakingSeconds}
                  </td>
                  <td className="hidden py-2 pr-3 xl:table-cell">
                    {s.motionsProposed}
                  </td>
                  <td className="hidden py-2 pr-3 xl:table-cell">
                    {s.documentsSponsored}
                  </td>
                  <td className="hidden py-2 pr-3 xl:table-cell">
                    {s.documentsSigned}
                  </td>
                  <td className="hidden py-2 pr-3 xl:table-cell">
                    {s.pointsRaised}
                  </td>
                  <td className="py-2 pr-3">{s.judgeScore ?? "—"}</td>
                  <td className="py-2 pr-3">{s.daisScore ?? "—"}</td>
                  <td className="py-2 pr-3 font-semibold">
                    {s.compositeScore?.toFixed(1) ?? "—"}
                  </td>
                  <td className="py-2">
                    {s.specialCircumstance && (
                      <Badge color="yellow">{s.specialCircumstance}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function AwardRow({
  label,
  country,
  name,
  score,
}: {
  label: string;
  country?: string;
  name?: string;
  score?: number;
}) {
  return (
    <div className="flex justify-between border-b border-purple-50 py-1">
      <span className="font-medium text-purple-900">{label}</span>
      <span className="text-purple-700">
        {country ?? "TBD"}
        {name ? ` — ${name}` : ""}
        {score !== undefined ? ` (${score.toFixed(1)})` : ""}
      </span>
    </div>
  );
}
