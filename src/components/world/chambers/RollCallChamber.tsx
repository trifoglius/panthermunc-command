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
import { layoutEntityArc } from "@/lib/world-chamber-layout";
import { RollCallPanel } from "@/components/rollcall/RollCallPanel";
import { Button } from "@/components/ui";
import type { RollCallStatus } from "@/lib/types";

const STATUS_COLOR: Record<RollCallStatus, string> = {
  present: "#b8f0c8",
  present_voting: "#8fe0b0",
  absent: "#f0c8c8",
};

const STATUS_CYCLE: RollCallStatus[] = [
  "present",
  "present_voting",
  "absent",
];

export function RollCallChamber() {
  const {
    activeCommittee,
    startRollCall,
    updateRollCallStatus,
  } = useConference();
  const { goToCommitteeHome } = useWorkspaceNavigation();
  const { playBack, playSelect, playConfirm } = useUiAudio();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(
    activeCommittee?.rollCalls[0]?.id ?? null
  );

  const session =
    activeCommittee?.rollCalls.find((r) => r.id === sessionId) ??
    activeCommittee?.rollCalls[0];

  const positions = useMemo(
    () => layoutEntityArc(activeCommittee?.delegates.length ?? 0),
    [activeCommittee?.delegates.length]
  );

  if (!activeCommittee) return null;

  const cycleStatus = (delegateId: string) => {
    if (!session) {
      const id = startRollCall("Opening Roll Call");
      setSessionId(id);
      updateRollCallStatus(id, delegateId, "present");
      playConfirm();
      return;
    }
    const current = session.attendance[delegateId] ?? "absent";
    const next =
      STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    updateRollCallStatus(session.id, delegateId, next);
    playSelect();
  };

  return (
    <ModuleChamber
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)]">
          Roll Call
        </h2>
      }
      subtitle={
        <p className="text-[color:var(--purple-primary)]">
          {session
            ? `${session.label} · tap cubes to cycle status`
            : "Start a session or tap a cube"}
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
              const id = startRollCall("Roll Call");
              setSessionId(id);
              playConfirm();
            }}
          >
            New session
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSheetOpen(true)}
          >
            Full panel
          </Button>
        </>
      }
      overlay={
        <ChamberSheet
          open={sheetOpen}
          title="Roll Call tools"
          onClose={() => setSheetOpen(false)}
          wide
        >
          <RollCallPanel />
        </ChamberSheet>
      }
    >
      {activeCommittee.delegates.map((d, i) => {
        const status = (session?.attendance[d.id] ?? "absent") as RollCallStatus;
        return (
          <EntityTile3D
            key={d.id}
            position={positions[i] ?? [0, 1, 0]}
            label={d.country}
            sublabel={status.replace("_", " ")}
            color={STATUS_COLOR[status]}
            scale={[1.1, 1.1, 1.1]}
            onSelect={() => cycleStatus(d.id)}
          />
        );
      })}
    </ModuleChamber>
  );
}
