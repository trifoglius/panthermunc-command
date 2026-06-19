"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  Select,
  Table,
  useToast,
} from "@/components/ui";
import type { PositionPaperStatus } from "@/lib/types";

const inputClass =
  "w-full rounded border border-purple-200 px-2 py-1 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function DelegateManager() {
  const {
    activeCommittee,
    addDelegate,
    updateDelegate,
    removeDelegate,
  } = useConference();
  const { success } = useToast();
  const [country, setCountry] = useState("");
  const [name, setName] = useState("");
  const [ppStatus, setPpStatus] = useState<PositionPaperStatus>("none");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState(false);

  if (!activeCommittee) return null;

  const removeTarget = activeCommittee.delegates.find((d) => d.id === removeId);

  const handleAdd = () => {
    if (!country.trim()) return;
    addDelegate(country.trim(), name.trim(), ppStatus);
    success(`Added ${country.trim()}`);
    setCountry("");
    setName("");
    setPpStatus("none");
  };

  const handleRemove = () => {
    if (!removeId) return;
    removeDelegate(removeId);
    success(`Removed ${removeTarget?.country ?? "delegate"}`);
    setRemoveId(null);
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
        <div className="mb-3 flex justify-end md:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileView((v) => !v)}
          >
            {mobileView ? "Table view" : "Card view"}
          </Button>
        </div>

        {mobileView ? (
          <div className="space-y-3 md:hidden">
            {activeCommittee.delegates.map((d) => (
              <div
                key={d.id}
                className="rounded-md border border-purple-100 p-3"
              >
                <Input
                  label="Country"
                  value={d.country}
                  onChange={(e) =>
                    updateDelegate({ ...d, country: e.target.value })
                  }
                />
                <div className="mt-2">
                  <Input
                    label="Delegate"
                    value={d.delegateName}
                    onChange={(e) =>
                      updateDelegate({ ...d, delegateName: e.target.value })
                    }
                  />
                </div>
                <div className="mt-2">
                  <Select
                    label="Position Paper"
                    value={d.positionPaperStatus}
                    onChange={(e) =>
                      updateDelegate({
                        ...d,
                        positionPaperStatus: e.target
                          .value as PositionPaperStatus,
                      })
                    }
                    options={[
                      { value: "none", label: "Not Submitted" },
                      { value: "epp", label: "EPP" },
                      { value: "lpp", label: "LPP" },
                    ]}
                  />
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-2"
                  onClick={() => setRemoveId(d.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className={mobileView ? "hidden md:block" : ""}>
          <Table stickyFirstColumn>
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
                      className={inputClass}
                      value={d.country}
                      aria-label={`Country for ${d.country}`}
                      onChange={(e) =>
                        updateDelegate({ ...d, country: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      className={inputClass}
                      value={d.delegateName}
                      aria-label={`Delegate name for ${d.country}`}
                      onChange={(e) =>
                        updateDelegate({ ...d, delegateName: e.target.value })
                      }
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      className={inputClass}
                      value={d.positionPaperStatus}
                      aria-label={`Position paper for ${d.country}`}
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
                      onClick={() => setRemoveId(d.id)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {activeCommittee.delegates.length === 0 && (
          <p className="text-sm text-purple-600">
            No delegates yet. Add countries to begin committee setup.
          </p>
        )}
      </Card>

      <ConfirmDialog
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={handleRemove}
        title="Remove delegate"
        message={
          <>
            Remove <strong>{removeTarget?.country}</strong> from this committee?
            This cannot be undone.
          </>
        }
        confirmLabel="Remove"
      />
    </div>
  );
}
