"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { exportCommitteeToExcel } from "@/lib/excel-export";
import { buildDelegateStats, getAwardPreview } from "@/lib/scoring";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";

export function StatsPanel() {
  const { activeCommittee, addSpeakingEvent, addPoint, resolvePoint } =
    useConference();
  const [speakerId, setSpeakerId] = useState("");
  const [eventType, setEventType] = useState("gsl");
  const [duration, setDuration] = useState("");
  const [pointType, setPointType] = useState<"order" | "privilege" | "inquiry">(
    "inquiry"
  );
  const [pointDelegate, setPointDelegate] = useState("");
  const [pointDesc, setPointDesc] = useState("");

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
    setDuration("");
  };

  const logPoint = () => {
    if (!pointDelegate || !pointDesc.trim()) return;
    addPoint({
      type: pointType,
      delegateId: pointDelegate,
      description: pointDesc.trim(),
    });
    setPointDesc("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => exportCommitteeToExcel(activeCommittee)}>
          Export Committee to Excel
        </Button>
      </div>

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

        <Card title="Special Circumstances (AP.1.10)">
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
                No Position Paper (AP.1.5 / AP.3.4):
              </p>
              <p className="text-sm text-purple-700">
                {awards.noPositionPaper.map((s) => s.country).join(", ")}
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Log Speaking Event">
          <div className="grid gap-3">
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
                { value: "yield", label: "Yield (Rule 4)" },
              ]}
            />
            <Input
              label="Duration (seconds)"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <Button onClick={logSpeech}>Log Speech</Button>
          </div>
        </Card>

        <Card title="Points (Rules 24–26)">
          <div className="grid gap-3">
            <Select
              label="Point Type"
              value={pointType}
              onChange={(e) =>
                setPointType(
                  e.target.value as "order" | "privilege" | "inquiry"
                )
              }
              options={[
                { value: "order", label: "Point of Order (Rule 24)" },
                {
                  value: "privilege",
                  label: "Point of Personal Privilege (Rule 25)",
                },
                { value: "inquiry", label: "Point of Inquiry (Rule 26)" },
              ]}
            />
            <Select
              label="Delegate"
              value={pointDelegate}
              onChange={(e) => setPointDelegate(e.target.value)}
              options={[
                { value: "", label: "Select..." },
                ...activeCommittee.delegates.map((d) => ({
                  value: d.id,
                  label: d.country,
                })),
              ]}
            />
            <Textarea
              label="Description"
              value={pointDesc}
              onChange={(e) => setPointDesc(e.target.value)}
              rows={2}
            />
            <Button onClick={logPoint}>Log Point</Button>
          </div>

          {activeCommittee.points.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {activeCommittee.points.map((p) => {
                const d = activeCommittee.delegates.find(
                  (x) => x.id === p.delegateId
                );
                return (
                  <li
                    key={p.id}
                    className={`rounded border p-2 ${
                      p.resolved
                        ? "border-gray-200 bg-gray-50 opacity-60"
                        : "border-purple-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        <Badge color="purple">{p.type}</Badge>{" "}
                        {d?.country}: {p.description}
                      </span>
                      {!p.resolved && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => resolvePoint(p.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Delegate Statistics">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-purple-100 text-purple-800">
                <th className="pb-2 pr-3">Rank</th>
                <th className="pb-2 pr-3">Country</th>
                <th className="pb-2 pr-3">Speeches</th>
                <th className="pb-2 pr-3">Time (s)</th>
                <th className="pb-2 pr-3">Motions</th>
                <th className="pb-2 pr-3">Sponsored</th>
                <th className="pb-2 pr-3">Signed</th>
                <th className="pb-2 pr-3">Points</th>
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
                  <td className="py-2 pr-3">{s.speeches}</td>
                  <td className="py-2 pr-3">{s.totalSpeakingSeconds}</td>
                  <td className="py-2 pr-3">{s.motionsProposed}</td>
                  <td className="py-2 pr-3">{s.documentsSponsored}</td>
                  <td className="py-2 pr-3">{s.documentsSigned}</td>
                  <td className="py-2 pr-3">{s.pointsRaised}</td>
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
          </table>
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
