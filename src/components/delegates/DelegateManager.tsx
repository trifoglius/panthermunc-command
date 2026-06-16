"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import type { PositionPaperStatus } from "@/lib/types";

export function DelegateManager() {
  const {
    activeCommittee,
    addDelegate,
    updateDelegate,
    removeDelegate,
  } = useConference();
  const [country, setCountry] = useState("");
  const [name, setName] = useState("");
  const [ppStatus, setPpStatus] = useState<PositionPaperStatus>("none");

  if (!activeCommittee) return null;

  const handleAdd = () => {
    if (!country.trim()) return;
    addDelegate(country.trim(), name.trim(), ppStatus);
    setCountry("");
    setName("");
    setPpStatus("none");
  };

  return (
    <div className="space-y-4">
      <Card title="Add Delegate / Country">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. France"
          />
          <Input
            label="Delegate Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
          />
          <Select
            label="Position Paper"
            value={ppStatus}
            onChange={(e) =>
              setPpStatus(e.target.value as PositionPaperStatus)
            }
            options={[
              { value: "none", label: "Not Submitted" },
              { value: "epp", label: "EPP (Eligible)" },
              { value: "lpp", label: "LPP (Late)" },
            ]}
          />
          <div className="flex items-end">
            <Button onClick={handleAdd} className="w-full">
              Add Country
            </Button>
          </div>
        </div>
      </Card>

      <Card title={`Delegates (${activeCommittee.delegates.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-purple-100 text-purple-800">
                <th className="pb-2 pr-4">Country</th>
                <th className="pb-2 pr-4">Delegate</th>
                <th className="pb-2 pr-4">Position Paper</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeCommittee.delegates.map((d) => (
                <tr key={d.id} className="border-b border-purple-50">
                  <td className="py-2 pr-4">
                    <input
                      className="w-full rounded border border-purple-100 px-2 py-1"
                      value={d.country}
                      onChange={(e) =>
                        updateDelegate({ ...d, country: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      className="w-full rounded border border-purple-100 px-2 py-1"
                      value={d.delegateName}
                      onChange={(e) =>
                        updateDelegate({ ...d, delegateName: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      className="rounded border border-purple-100 px-2 py-1"
                      value={d.positionPaperStatus}
                      onChange={(e) =>
                        updateDelegate({
                          ...d,
                          positionPaperStatus: e.target
                            .value as PositionPaperStatus,
                        })
                      }
                    >
                      <option value="none">Not Submitted</option>
                      <option value="epp">EPP</option>
                      <option value="lpp">LPP</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeDelegate(d.id)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {activeCommittee.delegates.length === 0 && (
          <p className="text-sm text-purple-600">
            No delegates yet. Add countries to begin committee setup.
          </p>
        )}
      </Card>
    </div>
  );
}
