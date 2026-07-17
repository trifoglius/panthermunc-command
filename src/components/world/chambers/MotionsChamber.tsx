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
import { layoutEntityFan, layoutEntityRail } from "@/lib/world-chamber-layout";
import { MotionPanel } from "@/components/motions/MotionPanel";
import { MotionQueuesPanel } from "@/components/motions/MotionQueuesPanel";
import { Button } from "@/components/ui";

const STATUS_COLOR: Record<string, string> = {
  pending: "#c8e4f5",
  passed: "#b8f0c8",
  failed: "#f0c8c8",
  withdrawn: "#ddd8e8",
};

export function MotionsChamber() {
  const { activeCommittee } = useConference();
  const { goToCommitteeHome } = useWorkspaceNavigation();
  const { playBack, playSelect } = useUiAudio();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const motions = activeCommittee?.motions ?? [];
  const positions = useMemo(
    () => layoutEntityFan(motions.length),
    [motions.length]
  );

  if (!activeCommittee) return null;

  return (
    <ModuleChamber
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)]">
          Motions
        </h2>
      }
      subtitle={
        <p className="text-[color:var(--purple-primary)]">
          {motions.length} motions · select a card for session tools
        </p>
      }
      onBack={() => {
        playBack();
        goToCommitteeHome();
      }}
      actions={
        <Button
          size="sm"
          onClick={() => {
            playSelect();
            setSelectedId(null);
            setSheetOpen(true);
          }}
        >
          Open tools
        </Button>
      }
      overlay={
        <ChamberSheet
          open={sheetOpen}
          title={
            selectedId
              ? motions.find((m) => m.id === selectedId)?.type ?? "Motion"
              : "Motions"
          }
          onClose={() => setSheetOpen(false)}
          wide
        >
          <MotionPanel />
        </ChamberSheet>
      }
    >
      {motions.map((m, i) => (
        <EntityTile3D
          key={m.id}
          position={positions[i] ?? [0, 1.2, 0]}
          label={m.type}
          sublabel={`${m.status} · ${m.proposedBy || "—"}`}
          color={STATUS_COLOR[m.status] ?? undefined}
          selected={selectedId === m.id}
          scale={[1.6, 1.05, 0.28]}
          onSelect={() => {
            playSelect();
            setSelectedId(m.id);
            setSheetOpen(true);
          }}
        />
      ))}
      {motions.length === 0 && (
        <EntityTile3D
          position={[0, 1.2, 0]}
          label="No motions yet"
          sublabel="Open tools to propose"
          scale={[2.2, 1.1, 0.3]}
          onSelect={() => {
            playSelect();
            setSheetOpen(true);
          }}
        />
      )}
    </ModuleChamber>
  );
}

export function MotionQueuesChamber() {
  const { activeCommittee } = useConference();
  const { goToCommitteeHome } = useWorkspaceNavigation();
  const { playBack, playSelect } = useUiAudio();
  const [sheetOpen, setSheetOpen] = useState(false);

  const history = activeCommittee?.motionQueueHistory ?? [];
  const positions = useMemo(
    () => layoutEntityRail(Math.max(history.length, 1), { spacing: 2.1 }),
    [history.length]
  );

  if (!activeCommittee) return null;

  return (
    <ModuleChamber
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)]">
          Motion Queues
        </h2>
      }
      subtitle={
        <p className="text-[color:var(--purple-primary)]">
          Archived queues · {history.length} snapshots
        </p>
      }
      onBack={() => {
        playBack();
        goToCommitteeHome();
      }}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          View archives
        </Button>
      }
      overlay={
        <ChamberSheet
          open={sheetOpen}
          title="Motion Queues"
          onClose={() => setSheetOpen(false)}
          wide
        >
          <MotionQueuesPanel />
        </ChamberSheet>
      }
    >
      {history.length === 0 ? (
        <EntityTile3D
          position={positions[0] ?? [0, 1.1, 0]}
          label="No archives yet"
          sublabel="Archive from Motions"
          scale={[1.8, 1, 0.3]}
          onSelect={() => {
            playSelect();
            setSheetOpen(true);
          }}
        />
      ) : (
        history.map((snap, i) => (
          <EntityTile3D
            key={snap.id}
            position={positions[i] ?? [0, 1.1, 0]}
            label={snap.label}
            sublabel={`${snap.motions.length} motions`}
            scale={[1.6, 1.05, 0.3]}
            onSelect={() => {
              playSelect();
              setSheetOpen(true);
            }}
          />
        ))
      )}
    </ModuleChamber>
  );
}
