"use client";

import { useMemo, useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { useWorkspaceNavigation } from "@/hooks/useWorkspaceNavigation";
import { useUiAudio } from "@/components/UiAudioProvider";
import {
  ChamberSheet,
  EntityTile3D,
  ModuleChamber,
} from "@/components/world/ModuleChamber";
import { layoutEntityGrid } from "@/lib/world-chamber-layout";
import { DelegateManager } from "@/components/delegates/DelegateManager";
import { Button, Input, Select, useToast } from "@/components/ui";
import type { PositionPaperStatus } from "@/lib/types";

export function DelegatesChamber() {
  const { activeCommittee, addDelegate } = useConference();
  const { goToCommitteeHome } = useWorkspaceNavigation();
  const { playBack, playSelect } = useUiAudio();
  const { success } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [name, setName] = useState("");
  const [ppStatus, setPpStatus] = useState<PositionPaperStatus>("none");

  const positions = useMemo(
    () => layoutEntityGrid(activeCommittee?.delegates.length ?? 0),
    [activeCommittee?.delegates.length]
  );

  if (!activeCommittee) return null;

  const selected = activeCommittee.delegates.find((d) => d.id === selectedId);

  return (
    <ModuleChamber
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)]">
          Delegates
        </h2>
      }
      subtitle={
        <p className="text-[color:var(--purple-primary)]">
          {activeCommittee.delegates.length} countries · {activeCommittee.name}
        </p>
      }
      onBack={() => {
        playBack();
        goToCommitteeHome();
      }}
      actions={
        <>
          <Button
            size="sm"
            onClick={() => {
              playSelect();
              setSelectedId(null);
              setSheetOpen(true);
            }}
          >
            Manage
          </Button>
        </>
      }
      overlay={
        <ChamberSheet
          open={sheetOpen}
          title={selected ? selected.country : "Delegates"}
          onClose={() => setSheetOpen(false)}
          wide
        >
          {!selected && (
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <Input
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Select
                label="Position Paper"
                value={ppStatus}
                onChange={(e) =>
                  setPpStatus(e.target.value as PositionPaperStatus)
                }
                options={[
                  { value: "none", label: "Not Submitted" },
                  { value: "epp", label: "EPP" },
                  { value: "lpp", label: "LPP" },
                ]}
              />
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!country.trim()) return;
                    addDelegate(country.trim(), name.trim(), ppStatus);
                    success(`Added ${country.trim()}`);
                    setCountry("");
                    setName("");
                    setPpStatus("none");
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
          <DelegateManager />
        </ChamberSheet>
      }
    >
      {activeCommittee.delegates.map((d, i) => (
        <EntityTile3D
          key={d.id}
          position={positions[i] ?? [0, 1, 0]}
          label={d.country}
          sublabel={d.delegateName || d.positionPaperStatus.toUpperCase()}
          selected={selectedId === d.id}
          color={
            d.positionPaperStatus === "epp"
              ? "#c8f5d8"
              : d.positionPaperStatus === "lpp"
                ? "#f5e8c8"
                : undefined
          }
          onSelect={() => {
            playSelect();
            setSelectedId(d.id);
            setSheetOpen(true);
          }}
        />
      ))}
      {activeCommittee.delegates.length === 0 && (
        <EntityTile3D
          position={[0, 1.2, 0]}
          label="Add delegates"
          sublabel="Click Manage"
          onSelect={() => {
            playSelect();
            setSheetOpen(true);
          }}
        />
      )}
    </ModuleChamber>
  );
}
