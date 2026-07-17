"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CubeConstellation } from "@/components/world/CubeConstellation";
import { useWorldOverlays } from "@/components/world/WorldOverlays";
import {
  GlyphDocs,
  GlyphExport,
  GlyphGear,
  GlyphMotions,
  GlyphPeople,
  GlyphQueue,
  GlyphRollCall,
  GlyphRules,
  GlyphScoring,
  GlyphStats,
  GlyphTheme,
  GlyphUser,
} from "@/components/home/HomeGlyphs";
import { useUiAudio } from "@/components/UiAudioProvider";
import { useAuth } from "@/context/AuthContext";
import { useConference } from "@/context/ConferenceContext";
import { useWorkspaceNavigation } from "@/hooks/useWorkspaceNavigation";
import { WORKSPACE_TABS, type TabId } from "@/lib/workspace-url";
import {
  canAccessAllCommittees,
  hasPermission,
} from "@/lib/permissions";
import { systemCubeDefs, type WorldCubeDef } from "@/lib/world-cube-catalog";

const TAB_ICONS: Record<TabId, ReactNode> = {
  delegates: <GlyphPeople />,
  rollcall: <GlyphRollCall />,
  motions: <GlyphMotions />,
  motion_queues: <GlyphQueue />,
  documents: <GlyphDocs />,
  scoring: <GlyphScoring />,
  stats: <GlyphStats />,
  rules: <GlyphRules />,
};

export function CommitteeHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeCommittee } = useConference();
  const { visibleTabs, setActiveTab, goToConferenceHome } =
    useWorkspaceNavigation();
  const { playSelect, playBack } = useUiAudio();
  const overlays = useWorldOverlays();

  const canManage = user ? hasPermission(user, "conference:manage") : false;
  const canManageUsers = user ? hasPermission(user, "users:manage") : false;
  const canExportAll = user ? hasPermission(user, "export:all") : false;
  const showBackToConference = user ? canAccessAllCommittees(user) : false;

  const cubes: WorldCubeDef[] = useMemo(() => {
    const modules = WORKSPACE_TABS.filter((t) => visibleTabs.includes(t.id));
    const list: WorldCubeDef[] = modules.map((tab) => ({
      id: `module-${tab.id}`,
      kind: "module",
      label: tab.label,
      tabId: tab.id,
    }));
    list.push(
      ...systemCubeDefs({
        canManageConference: canManage,
        canManageUsers,
        canExport: canExportAll || !!activeCommittee,
      })
    );
    return list;
  }, [visibleTabs, canManage, canManageUsers, canExportAll, activeCommittee]);

  const icons = useMemo(() => {
    const map: Record<string, ReactNode> = {
      "sys-settings": <GlyphGear />,
      "sys-users": <GlyphUser />,
      "sys-export": <GlyphExport />,
      "sys-theme": <GlyphTheme />,
    };
    for (const tab of WORKSPACE_TABS) {
      map[`module-${tab.id}`] = TAB_ICONS[tab.id];
    }
    return map;
  }, []);

  if (!user || !activeCommittee) return null;

  return (
    <CubeConstellation
      cubes={cubes}
      icons={icons}
      layoutKey={`committee-${activeCommittee.id}`}
      title={
        <h2 className="text-3xl font-bold tracking-tight text-[color:var(--purple-dark)] md:text-4xl">
          {activeCommittee.name}
        </h2>
      }
      subtitle={
        <p className="mt-1 text-[color:var(--purple-primary)]">
          {activeCommittee.type.toUpperCase()}
          {activeCommittee.topic ? ` · ${activeCommittee.topic}` : ""}
        </p>
      }
      hint="Drag cubes to rearrange · Click a module to open"
      onBack={
        showBackToConference
          ? () => {
              playBack();
              goToConferenceHome();
            }
          : undefined
      }
      backLabel="← Conference Home"
      overlay={overlays.nodes}
      onCubeActivate={(cube) => {
        playSelect();
        if (cube.kind === "module" && cube.tabId) {
          setActiveTab(cube.tabId);
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
