"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useUiAudio } from "@/components/UiAudioProvider";
import {
  ChamberSheet,
  EntityTile3D,
  ModuleChamber,
} from "@/components/world/ModuleChamber";
import { layoutEntityGrid } from "@/lib/world-chamber-layout";
import { Button } from "@/components/ui";

function AdminChamberShell({
  title,
  subtitle,
  entities,
  sheetTitle,
  children,
  backHref = "/",
}: {
  title: string;
  subtitle: string;
  entities: { id: string; label: string; sublabel?: string; color?: string }[];
  sheetTitle: string;
  children: ReactNode;
  backHref?: string;
}) {
  const router = useRouter();
  const { playBack, playSelect } = useUiAudio();
  const [sheetOpen, setSheetOpen] = useState(false);
  const positions = useMemo(
    () => layoutEntityGrid(entities.length, { cols: 3, spacing: 2.2, y: 1.3 }),
    [entities.length]
  );

  return (
    <ModuleChamber
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)]">
          {title}
        </h2>
      }
      subtitle={
        <p className="text-[color:var(--purple-primary)]">{subtitle}</p>
      }
      onBack={() => {
        playBack();
        router.push(backHref);
      }}
      backLabel="← Home"
      actions={
        <Button
          size="sm"
          onClick={() => {
            playSelect();
            setSheetOpen(true);
          }}
        >
          Open
        </Button>
      }
      overlay={
        <ChamberSheet
          open={sheetOpen}
          title={sheetTitle}
          onClose={() => setSheetOpen(false)}
          wide
        >
          {children}
        </ChamberSheet>
      }
    >
      {entities.map((e, i) => (
        <EntityTile3D
          key={e.id}
          position={positions[i] ?? [0, 1.3, 0]}
          label={e.label}
          sublabel={e.sublabel}
          color={e.color}
          scale={[1.5, 1.2, 0.4]}
          onSelect={() => {
            playSelect();
            setSheetOpen(true);
          }}
        />
      ))}
    </ModuleChamber>
  );
}

export function SettingsChamber({ children }: { children: ReactNode }) {
  return (
    <AdminChamberShell
      title="Settings"
      subtitle="Conference admin chamber"
      entities={[
        { id: "details", label: "Details", sublabel: "Name & year", color: "#d8eef8" },
        { id: "committees", label: "Committees", sublabel: "Edit list", color: "#c8e8f5" },
        { id: "notify", label: "Notify", sublabel: "Chair banners", color: "#b8e0f0" },
        { id: "stats", label: "Stats", sublabel: "Overview", color: "#a8d8eb" },
        { id: "danger", label: "Danger", sublabel: "Delete", color: "#f0d0d0" },
      ]}
      sheetTitle="Manage Conference"
    >
      {children}
    </AdminChamberShell>
  );
}

export function UsersChamber({ children }: { children: ReactNode }) {
  return (
    <AdminChamberShell
      title="Users"
      subtitle="Accounts & permissions"
      entities={[
        { id: "add", label: "Add user", sublabel: "Create account", color: "#d8f0e0" },
        { id: "roles", label: "Roles", sublabel: "Permissions", color: "#c8e4f5" },
        { id: "assign", label: "Assign", sublabel: "Committees", color: "#e8e0f5" },
      ]}
      sheetTitle="Manage Users"
    >
      {children}
    </AdminChamberShell>
  );
}
