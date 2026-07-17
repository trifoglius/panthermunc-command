"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CubeConstellation } from "@/components/world/CubeConstellation";
import { useWorldOverlays } from "@/components/world/WorldOverlays";
import {
  GlyphCommittee,
  GlyphExport,
  GlyphGear,
  GlyphPlus,
  GlyphTheme,
  GlyphUser,
} from "@/components/home/HomeGlyphs";
import { useUiAudio } from "@/components/UiAudioProvider";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { useWorkspaceNavigation } from "@/hooks/useWorkspaceNavigation";
import { hasPermission } from "@/lib/permissions";
import { systemCubeDefs, type WorldCubeDef } from "@/lib/world-cube-catalog";
import type { ReactNode } from "react";

export function ConferenceHome({
  onRequestCreate,
}: {
  onRequestCreate?: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { conference, activeCommittee } = useConference();
  const { selectCommitteeHome } = useWorkspaceNavigation();
  const { playSelect } = useUiAudio();
  const overlays = useWorldOverlays();

  const canCreate = user ? hasPermission(user, "conference:manage") : false;
  const canManageUsers = user ? hasPermission(user, "users:manage") : false;
  const canExportAll = user ? hasPermission(user, "export:all") : false;

  const cubes: WorldCubeDef[] = useMemo(() => {
    if (!conference) return [];
    const list: WorldCubeDef[] = conference.committees.map((c) => ({
      id: `committee-${c.id}`,
      kind: "committee",
      label: c.name,
      committeeId: c.id,
      selected: activeCommittee?.id === c.id,
    }));
    if (canCreate && onRequestCreate) {
      list.push({ id: "create", kind: "create", label: "Create" });
    }
    list.push(
      ...systemCubeDefs({
        canManageConference: canCreate,
        canManageUsers,
        canExport: canExportAll || !!activeCommittee,
      })
    );
    return list;
  }, [
    conference,
    activeCommittee,
    canCreate,
    canManageUsers,
    canExportAll,
    onRequestCreate,
  ]);

  const icons = useMemo(() => {
    const map: Record<string, ReactNode> = {
      create: <GlyphPlus />,
      "sys-settings": <GlyphGear />,
      "sys-users": <GlyphUser />,
      "sys-export": <GlyphExport />,
      "sys-theme": <GlyphTheme />,
    };
    for (const c of conference?.committees ?? []) {
      map[`committee-${c.id}`] = <GlyphCommittee />;
    }
    return map;
  }, [conference?.committees]);

  if (!conference || !user) return null;

  return (
    <CubeConstellation
      cubes={cubes}
      icons={icons}
      layoutKey={`conference-${conference.id}`}
      hint="Drag cubes to rearrange · Click to open · Pan to look around"
      title={
        <>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--purple-primary)]">
            Home Menu
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-[color:var(--purple-dark)] md:text-4xl">
            {conference.name}
          </h2>
        </>
      }
      subtitle={
        <p className="mt-1 text-[color:var(--purple-primary)]">
          {conference.year}
        </p>
      }
      overlay={overlays.nodes}
      onCubeActivate={(cube) => {
        playSelect();
        if (cube.kind === "committee" && cube.committeeId) {
          void selectCommitteeHome(cube.committeeId);
        } else if (cube.kind === "create") {
          onRequestCreate?.();
        } else if (cube.kind === "settings") {
          router.push("/settings");
        } else if (cube.kind === "users") {
          router.push("/admin/users");
        } else if (cube.kind === "export") {
          overlays.openExport();
        } else if (cube.kind === "theme") {
          overlays.openTheme();
        }
      }}
    />
  );
}
