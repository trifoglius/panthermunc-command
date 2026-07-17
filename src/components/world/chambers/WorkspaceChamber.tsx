"use client";

import type { TabId } from "@/lib/workspace-url";
import { DelegatesChamber } from "@/components/world/chambers/DelegatesChamber";
import { RollCallChamber } from "@/components/world/chambers/RollCallChamber";
import {
  MotionsChamber,
  MotionQueuesChamber,
} from "@/components/world/chambers/MotionsChamber";
import {
  DocumentsChamber,
  ScoringChamber,
  StatsChamber,
  RulesChamber,
} from "@/components/world/chambers/WorkspaceChambers";

export function WorkspaceChamber({ activeTab }: { activeTab: TabId }) {
  switch (activeTab) {
    case "delegates":
      return <DelegatesChamber />;
    case "rollcall":
      return <RollCallChamber />;
    case "motions":
      return <MotionsChamber />;
    case "motion_queues":
      return <MotionQueuesChamber />;
    case "documents":
      return <DocumentsChamber />;
    case "scoring":
      return <ScoringChamber />;
    case "stats":
      return <StatsChamber />;
    case "rules":
      return <RulesChamber />;
    default:
      return <DelegatesChamber />;
  }
}
