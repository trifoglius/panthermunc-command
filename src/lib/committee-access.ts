import type { CommitteeData } from "@/db/schema";
import type { SessionData } from "@/lib/auth-types";
import { canOperateCommittee } from "@/lib/permissions";

export function applyCommitteeDataUpdate(
  current: CommitteeData,
  incoming: Partial<CommitteeData>,
  session: SessionData,
  committeeId: string
): CommitteeData {
  if (canOperateCommittee(session, committeeId)) {
    return { ...current, ...incoming };
  }

  throw new Error("Not authorized to modify committee data");
}
