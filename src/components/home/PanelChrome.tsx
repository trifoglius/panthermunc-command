"use client";

import { WORKSPACE_TABS, type TabId } from "@/lib/workspace-url";
import { useUiAudio } from "@/components/UiAudioProvider";
import { Button } from "@/components/ui";
import { UtilityDock } from "@/components/home/UtilityDock";

export function PanelChrome({
  committeeName,
  activeTab,
  onBack,
}: {
  committeeName: string;
  activeTab: TabId;
  onBack: () => void;
}) {
  const { playBack } = useUiAudio();
  const label =
    WORKSPACE_TABS.find((t) => t.id === activeTab)?.label ?? activeTab;

  return (
    <div className="panel-chrome">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          playBack();
          onBack();
        }}
      >
        ← Modules
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--purple-primary)]">
          {committeeName}
        </p>
        <p className="truncate text-base font-semibold text-[color:var(--purple-dark)]">
          {label}
        </p>
      </div>
      <UtilityDock className="!gap-2 !px-2 !py-1.5" showOps />
    </div>
  );
}
