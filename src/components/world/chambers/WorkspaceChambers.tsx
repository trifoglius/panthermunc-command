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
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import { ScoringPanel } from "@/components/scoring/ScoringPanel";
import { StatsPanel } from "@/components/stats/StatsPanel";
import { RulesOfProcedurePanel } from "@/components/rules/RulesOfProcedurePanel";
import { buildDelegateStats, getAwardPreview } from "@/lib/scoring";
import { Button } from "@/components/ui";

export function DocumentsChamber() {
  const { activeCommittee } = useConference();
  const { goToCommitteeHome } = useWorkspaceNavigation();
  const { playBack, playSelect } = useUiAudio();
  const [sheetOpen, setSheetOpen] = useState(false);
  const docs = activeCommittee?.documents ?? [];
  const positions = useMemo(
    () => layoutEntityGrid(docs.length, { cols: 4, spacing: 1.8 }),
    [docs.length]
  );

  if (!activeCommittee) return null;

  return (
    <ModuleChamber
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)]">
          Documents
        </h2>
      }
      subtitle={
        <p className="text-[color:var(--purple-primary)]">
          {docs.length} documents
        </p>
      }
      onBack={() => {
        playBack();
        goToCommitteeHome();
      }}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          Manage
        </Button>
      }
      overlay={
        <ChamberSheet
          open={sheetOpen}
          title="Documents"
          onClose={() => setSheetOpen(false)}
          wide
        >
          <DocumentPanel />
        </ChamberSheet>
      }
    >
      {docs.length === 0 ? (
        <EntityTile3D
          position={[0, 1.2, 0]}
          label="No documents"
          sublabel="Open manage"
          scale={[2, 1.2, 0.25]}
          onSelect={() => {
            playSelect();
            setSheetOpen(true);
          }}
        />
      ) : (
        docs.map((d, i) => (
          <EntityTile3D
            key={d.id}
            position={positions[i] ?? [0, 1, 0]}
            label={d.title}
            sublabel={`${d.type.replace("_", " ")} · ${d.status}`}
            scale={[1.5, 1.15, 0.22]}
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

export function ScoringChamber() {
  const { activeCommittee } = useConference();
  const { goToCommitteeHome } = useWorkspaceNavigation();
  const { playBack, playSelect } = useUiAudio();
  const [sheetOpen, setSheetOpen] = useState(false);
  const delegates = activeCommittee?.delegates ?? [];
  const positions = useMemo(
    () => layoutEntityGrid(delegates.length, { spacing: 1.6 }),
    [delegates.length]
  );

  if (!activeCommittee) return null;

  return (
    <ModuleChamber
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)]">
          Scoring
        </h2>
      }
      subtitle={
        <p className="text-[color:var(--purple-primary)]">
          Score pillars · open tools to edit rubric
        </p>
      }
      onBack={() => {
        playBack();
        goToCommitteeHome();
      }}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          Score tools
        </Button>
      }
      overlay={
        <ChamberSheet
          open={sheetOpen}
          title="Scoring"
          onClose={() => setSheetOpen(false)}
          wide
        >
          <ScoringPanel />
        </ChamberSheet>
      }
    >
      {delegates.map((d, i) => {
        const dais = activeCommittee.daisScores.find(
          (s) => s.delegateId === d.id
        );
        const total = dais?.total ?? 0;
        const height = 0.6 + Math.min(total / 40, 2.2);
        return (
          <EntityTile3D
            key={d.id}
            position={positions[i] ?? [0, 1, 0]}
            label={d.country}
            sublabel={total ? `${total} pts` : "—"}
            scale={[0.9, height, 0.9]}
            color="#d4eef8"
            onSelect={() => {
              playSelect();
              setSheetOpen(true);
            }}
          />
        );
      })}
    </ModuleChamber>
  );
}

export function StatsChamber() {
  const { activeCommittee } = useConference();
  const { goToCommitteeHome } = useWorkspaceNavigation();
  const { playBack, playSelect } = useUiAudio();
  const [sheetOpen, setSheetOpen] = useState(false);

  const stats = useMemo(
    () => (activeCommittee ? buildDelegateStats(activeCommittee) : []),
    [activeCommittee]
  );
  const awards = useMemo(
    () =>
      activeCommittee
        ? getAwardPreview(activeCommittee)
        : null,
    [activeCommittee]
  );
  const awardCount = awards
    ? [
        awards.bestDelegate,
        awards.outstandingDelegate,
        awards.honorableDelegate,
        awards.verbalCommendation,
        awards.positionPaper,
      ].filter(Boolean).length
    : 0;
  const orbs = useMemo(
    () => [
      {
        id: "speeches",
        label: "Speeches",
        value: stats.reduce((a, s) => a + s.speeches, 0),
      },
      {
        id: "motions",
        label: "Motions",
        value: activeCommittee?.motions.length ?? 0,
      },
      {
        id: "docs",
        label: "Documents",
        value: activeCommittee?.documents.length ?? 0,
      },
      { id: "awards", label: "Awards", value: awardCount },
    ],
    [stats, activeCommittee, awardCount]
  );
  const positions = useMemo(
    () => layoutEntityGrid(orbs.length, { cols: 4, spacing: 2.2, y: 1.4 }),
    [orbs.length]
  );

  if (!activeCommittee) return null;

  return (
    <ModuleChamber
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)]">
          Stats
        </h2>
      }
      subtitle={
        <p className="text-[color:var(--purple-primary)]">
          Live aggregates for {activeCommittee.name}
        </p>
      }
      onBack={() => {
        playBack();
        goToCommitteeHome();
      }}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          Details
        </Button>
      }
      overlay={
        <ChamberSheet
          open={sheetOpen}
          title="Statistics"
          onClose={() => setSheetOpen(false)}
          wide
        >
          <StatsPanel />
        </ChamberSheet>
      }
    >
      {orbs.map((o, i) => (
        <EntityTile3D
          key={o.id}
          position={positions[i] ?? [0, 1.4, 0]}
          label={o.label}
          sublabel={String(o.value)}
          scale={[1.3, 1.3, 1.3]}
          color="#c8eef5"
          onSelect={() => {
            playSelect();
            setSheetOpen(true);
          }}
        />
      ))}
    </ModuleChamber>
  );
}

export function RulesChamber() {
  const { activeCommittee } = useConference();
  const { goToCommitteeHome } = useWorkspaceNavigation();
  const { playBack, playSelect } = useUiAudio();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!activeCommittee) return null;

  return (
    <ModuleChamber
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)]">
          Rules of Procedure
        </h2>
      }
      subtitle={
        <p className="text-[color:var(--purple-primary)]">
          Glass tome · open to read
        </p>
      }
      onBack={() => {
        playBack();
        goToCommitteeHome();
      }}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          Open rules
        </Button>
      }
      overlay={
        <ChamberSheet
          open={sheetOpen}
          title="Rules of Procedure"
          onClose={() => setSheetOpen(false)}
          wide
        >
          <RulesOfProcedurePanel />
        </ChamberSheet>
      }
    >
      <EntityTile3D
        position={[-1.6, 1.3, 0]}
        label="Volume I"
        sublabel="Procedure"
        scale={[1.4, 1.8, 0.35]}
        color="#e8f4fb"
        onSelect={() => {
          playSelect();
          setSheetOpen(true);
        }}
      />
      <EntityTile3D
        position={[0.2, 1.3, 0.2]}
        label="Volume II"
        sublabel="Voting"
        scale={[1.4, 1.6, 0.35]}
        color="#d8ecf8"
        onSelect={() => {
          playSelect();
          setSheetOpen(true);
        }}
      />
      <EntityTile3D
        position={[2.0, 1.3, -0.1]}
        label="Volume III"
        sublabel="Points"
        scale={[1.4, 1.4, 0.35]}
        color="#c8e4f5"
        onSelect={() => {
          playSelect();
          setSheetOpen(true);
        }}
      />
    </ModuleChamber>
  );
}
