"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";

export function PointsPanel() {
  const {
    activeCommittee,
    addPoint,
    resolvePoint,
    setPointRuling,
    startAppeal,
    resolveAppeal,
  } = useConference();
  const [pointDelegate, setPointDelegate] = useState("");
  const [pointDesc, setPointDesc] = useState("");
  const [rulingDraft, setRulingDraft] = useState<Record<string, string>>({});
  const [appealVotes, setAppealVotes] = useState<
    Record<string, { yes: string; no: string; abstain: string }>
  >({});

  if (!activeCommittee) return null;

  const logPoint = () => {
    if (!pointDelegate || !pointDesc.trim()) return;
    addPoint({
      type: "order",
      delegateId: pointDelegate,
      description: pointDesc.trim(),
    });
    setPointDesc("");
  };

  const country = (id: string) =>
    activeCommittee.delegates.find((d) => d.id === id)?.country ?? id;

  const unresolved = activeCommittee.points.filter((p) => !p.resolved);
  const resolved = activeCommittee.points.filter((p) => p.resolved);

  return (
    <Card title="Points of order">
      <p className="mb-3 text-sm text-purple-700">
        Record points of order. The Chair decides immediately; rulings may be
        appealed and put to a vote.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
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
      </div>
      <div className="mt-3">
        <Textarea
          label="Description"
          value={pointDesc}
          onChange={(e) => setPointDesc(e.target.value)}
          rows={3}
          placeholder="Describe the point raised..."
        />
      </div>
      <div className="mt-3">
        <Button onClick={logPoint} disabled={!pointDelegate || !pointDesc.trim()}>
          Log point of order
        </Button>
      </div>

      {unresolved.length > 0 && (
        <div className="mt-6 border-t border-purple-200 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-purple-900">
            Open ({unresolved.length})
          </h3>
          <ul className="space-y-4">
            {unresolved.map((p) => {
              const votes = appealVotes[p.id] ?? {
                yes: "",
                no: "",
                abstain: "",
              };
              return (
                <li
                  key={p.id}
                  className="rounded border border-purple-100 p-3"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium text-purple-900">
                      {country(p.delegateId)}
                    </span>
                    <Badge color="purple">Point of order</Badge>
                  </div>
                  <p className="mt-1 text-sm text-purple-700">{p.description}</p>
                  <Input
                    className="mt-2"
                    label="Chair ruling"
                    value={rulingDraft[p.id] ?? p.chairRuling ?? ""}
                    onChange={(e) =>
                      setRulingDraft({
                        ...rulingDraft,
                        [p.id]: e.target.value,
                      })
                    }
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setPointRuling(
                          p.id,
                          rulingDraft[p.id] ?? p.chairRuling ?? ""
                        )
                      }
                    >
                      Save ruling
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        startAppeal(
                          p.id,
                          rulingDraft[p.id] ?? p.chairRuling ?? ""
                        )
                      }
                    >
                      Appeal ruling
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resolvePoint(p.id)}
                    >
                      Resolve (no appeal)
                    </Button>
                  </div>
                  {p.appealStatus === "pending" && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <Input
                        label="Yes (overrule)"
                        value={votes.yes}
                        onChange={(e) =>
                          setAppealVotes({
                            ...appealVotes,
                            [p.id]: { ...votes, yes: e.target.value },
                          })
                        }
                      />
                      <Input
                        label="No (sustain)"
                        value={votes.no}
                        onChange={(e) =>
                          setAppealVotes({
                            ...appealVotes,
                            [p.id]: { ...votes, no: e.target.value },
                          })
                        }
                      />
                      <Input
                        label="Abstain"
                        value={votes.abstain}
                        onChange={(e) =>
                          setAppealVotes({
                            ...appealVotes,
                            [p.id]: { ...votes, abstain: e.target.value },
                          })
                        }
                      />
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          onClick={() =>
                            resolveAppeal(
                              p.id,
                              Number(votes.yes) || 0,
                              Number(votes.no) || 0,
                              Number(votes.abstain) || 0
                            )
                          }
                        >
                          Decide appeal
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {resolved.length > 0 && (
        <div className="mt-6 border-t border-purple-200 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-purple-900">
            Resolved ({resolved.length})
          </h3>
          <ul className="space-y-2 text-sm text-purple-700">
            {resolved.map((p) => (
              <li key={p.id}>
                {country(p.delegateId)}: {p.description}
                {p.chairRuling ? ` — Ruling: ${p.chairRuling}` : ""}
                {p.appealStatus && p.appealStatus !== "none"
                  ? ` — Appeal: ${p.appealStatus}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
