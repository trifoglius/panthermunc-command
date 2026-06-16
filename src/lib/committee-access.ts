import type { CommitteeData } from "@/db/schema";
import type { SessionData } from "@/lib/auth-types";
import {
  SCORING_DATA_KEYS,
  canOperateCommittee,
  hasPermission,
} from "@/lib/permissions";

export function applyCommitteeDataUpdate(
  current: CommitteeData,
  incoming: Partial<CommitteeData>,
  session: SessionData,
  committeeId: string
): CommitteeData {
  if (canOperateCommittee(session, committeeId)) {
    return { ...current, ...incoming };
  }

  if (hasPermission(session, "scoring:edit")) {
    const merged = { ...current };
    for (const key of SCORING_DATA_KEYS) {
      if (key in incoming) {
        (merged as Record<string, unknown>)[key] =
          incoming[key as keyof CommitteeData];
      }
    }
    return merged;
  }

  throw new Error("Not authorized to modify committee data");
}
