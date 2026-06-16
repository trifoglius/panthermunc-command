"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { getRubric } from "@/lib/scoring";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import type { ScorerRole } from "@/lib/types";

export function ScoringPanel() {
  const {
    activeCommittee,
    updateCommittee,
    updateRubricScore,
    signScores,
    updatePositionPaperScore,
    setVcRecipient,
  } = useConference();
  const [role, setRole] = useState<ScorerRole>("dais");

  if (!activeCommittee) return null;

  const rubric = getRubric(activeCommittee.type);
  const scores =
    role === "judge"
      ? activeCommittee.judgeScores
      : activeCommittee.daisScores;
  const otherSigned =
    role === "judge"
      ? activeCommittee.daisScores.every((s) => s.signed)
      : activeCommittee.judgeScores.every((s) => s.signed);

  return (
    <div className="space-y-4">
      <Card title="Awards Scoring (AP.1)">
        <p className="mb-3 text-sm text-purple-700">
          Judge and dais score independently. Composite score is the average
          (AP.1.8). Scorers should not see each other&apos;s scores during
          committee (AP.1.4).
        </p>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Select
            label="Your Role"
            value={role}
            onChange={(e) => setRole(e.target.value as ScorerRole)}
            options={[
              { value: "dais", label: "Dais Scorer" },
              { value: "judge", label: "Judge Scorer" },
            ]}
          />
          <Input
            label="Discrepancy Threshold (AP.1.10)"
            type="number"
            value={activeCommittee.discrepancyThreshold}
            onChange={(e) =>
              updateCommittee({
                ...activeCommittee,
                discrepancyThreshold: Number(e.target.value) || 10,
              })
            }
            className="max-w-xs"
          />
          <Button onClick={() => signScores(role)}>
            Sign &amp; Submit Scoresheet (AP.2.1)
          </Button>
        </div>

        {scores.some((s) => s.signed) && (
          <Badge color="green">
            {role === "judge" ? "Judge" : "Dais"} scores signed
          </Badge>
        )}
        {!otherSigned && (
          <p className="mt-2 text-sm text-purple-600">
            The other scorer&apos;s scoresheet is hidden from this view per
            AP.1.4.
          </p>
        )}
      </Card>

      <Card title={`${activeCommittee.type.toUpperCase()} Rubric Scoring`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-purple-100 text-purple-800">
                <th className="pb-2 pr-3">Country</th>
                {rubric.map((cat) => (
                  <th key={cat.key} className="pb-2 pr-3 text-center">
                    {cat.label}
                    <br />
                    <span className="text-xs font-normal">(max {cat.max})</span>
                  </th>
                ))}
                <th className="pb-2 pr-3">Total</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {activeCommittee.delegates.map((d) => {
                const entry = scores.find((s) => s.delegateId === d.id);
                const currentScores = entry?.scores ?? {};
                const total = entry?.total ?? 0;
                return (
                  <tr key={d.id} className="border-b border-purple-50">
                    <td className="py-2 pr-3 font-medium">{d.country}</td>
                    {rubric.map((cat) => (
                      <td key={cat.key} className="py-2 pr-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={cat.max}
                          className="w-16 rounded border border-purple-200 px-2 py-1 text-center"
                          value={currentScores[cat.key] ?? 0}
                          onChange={(e) => {
                            const val = Math.min(
                              cat.max,
                              Math.max(0, Number(e.target.value) || 0)
                            );
                            updateRubricScore(
                              role,
                              d.id,
                              { ...currentScores, [cat.key]: val },
                              entry?.notes
                            );
                          }}
                        />
                      </td>
                    ))}
                    <td className="py-2 pr-3 text-center font-bold">
                      {total}
                    </td>
                    <td className="py-2">
                      <input
                        className="w-full min-w-32 rounded border border-purple-200 px-2 py-1"
                        value={entry?.notes ?? ""}
                        onChange={(e) =>
                          updateRubricScore(
                            role,
                            d.id,
                            currentScores,
                            e.target.value
                          )
                        }
                        placeholder="Notes"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {activeCommittee.type !== "crisis" && (
        <Card title="Position Paper Scores (AP.3)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-purple-100 text-purple-800">
                  <th className="pb-2 pr-4">Country</th>
                  <th className="pb-2 pr-4">PP Status</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {activeCommittee.delegates.map((d) => {
                  const pp = activeCommittee.positionPaperScores.find(
                    (s) => s.delegateId === d.id
                  );
                  return (
                    <tr key={d.id} className="border-b border-purple-50">
                      <td className="py-2 pr-4">{d.country}</td>
                      <td className="py-2 pr-4 uppercase">
                        {d.positionPaperStatus}
                      </td>
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20 rounded border border-purple-200 px-2 py-1"
                          value={pp?.score ?? ""}
                          onChange={(e) =>
                            updatePositionPaperScore(
                              d.id,
                              Number(e.target.value) || 0,
                              pp?.notes
                            )
                          }
                        />
                      </td>
                      <td className="py-2">
                        <input
                          className="w-full rounded border border-purple-200 px-2 py-1"
                          value={pp?.notes ?? ""}
                          onChange={(e) =>
                            updatePositionPaperScore(
                              d.id,
                              pp?.score ?? 0,
                              e.target.value
                            )
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Verbal Commendation (AP.2.8)">
        <p className="mb-3 text-sm text-purple-700">
          VC is chosen by the Chair and cannot go to a BICA recipient.
        </p>
        <Select
          label="VC Recipient"
          value={activeCommittee.vcRecipientId ?? ""}
          onChange={(e) =>
            setVcRecipient(e.target.value || undefined)
          }
          options={[
            { value: "", label: "Not selected" },
            ...activeCommittee.delegates.map((d) => ({
              value: d.id,
              label: d.country,
            })),
          ]}
        />
      </Card>
    </div>
  );
}
