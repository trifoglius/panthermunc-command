"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import type { PointType } from "@/lib/types";

export function PointsPanel() {
  const { activeCommittee, addPoint, resolvePoint } = useConference();
  const [pointType, setPointType] = useState<PointType>("inquiry");
  const [pointDelegate, setPointDelegate] = useState("");
  const [pointDesc, setPointDesc] = useState("");

  if (!activeCommittee) return null;

  const logPoint = () => {
    if (!pointDelegate || !pointDesc.trim()) return;
    addPoint({
      type: pointType,
      delegateId: pointDelegate,
      description: pointDesc.trim(),
    });
    setPointDesc("");
  };

  const unresolved = activeCommittee.points.filter((p) => !p.resolved);
  const resolved = activeCommittee.points.filter((p) => p.resolved);

  return (
    <div className="space-y-4">
      <Card title="Log Point (Rules 24–26)">
        <p className="mb-3 text-sm text-purple-700">
          Record points of order, personal privilege, and inquiry raised during
          committee.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Point Type"
            value={pointType}
            onChange={(e) => setPointType(e.target.value as PointType)}
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
            Log Point
          </Button>
        </div>
      </Card>

      {unresolved.length > 0 && (
        <Card title={`Open Points (${unresolved.length})`}>
          <ul className="space-y-2">
            {unresolved.map((p) => {
              const d = activeCommittee.delegates.find(
                (x) => x.id === p.delegateId
              );
              return (
                <PointRow
                  key={p.id}
                  country={d?.country ?? "Unknown"}
                  type={p.type}
                  description={p.description}
                  timestamp={p.timestamp}
                  onResolve={() => resolvePoint(p.id)}
                />
              );
            })}
          </ul>
        </Card>
      )}

      {resolved.length > 0 && (
        <Card title="Resolved Points">
          <ul className="space-y-2">
            {resolved.map((p) => {
              const d = activeCommittee.delegates.find(
                (x) => x.id === p.delegateId
              );
              return (
                <PointRow
                  key={p.id}
                  country={d?.country ?? "Unknown"}
                  type={p.type}
                  description={p.description}
                  timestamp={p.timestamp}
                  resolved
                />
              );
            })}
          </ul>
        </Card>
      )}

      {activeCommittee.points.length === 0 && (
        <p className="text-center text-sm text-purple-600">
          No points logged yet.
        </p>
      )}
    </div>
  );
}

function PointRow({
  country,
  type,
  description,
  timestamp,
  resolved,
  onResolve,
}: {
  country: string;
  type: string;
  description: string;
  timestamp: string;
  resolved?: boolean;
  onResolve?: () => void;
}) {
  return (
    <li
      className={`rounded border p-3 ${
        resolved
          ? "border-gray-200 bg-gray-50 opacity-70"
          : "border-purple-100 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="purple">{type}</Badge>
            <span className="font-medium text-purple-900">{country}</span>
            <span className="text-xs text-purple-500">
              {new Date(timestamp).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-purple-800">{description}</p>
        </div>
        {!resolved && onResolve && (
          <Button size="sm" variant="secondary" onClick={onResolve}>
            Resolve
          </Button>
        )}
      </div>
    </li>
  );
}
