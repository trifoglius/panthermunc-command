import type { CommitteeData } from "@/db/schema";
import type { SessionData } from "@/lib/auth-types";
import {
  SCORING_SETTINGS_KEYS,
  SETTINGS_DATA_KEYS,
  canOperateCommittee,
  hasPermission,
} from "@/lib/permissions";

/**
 * Apply a settings-only blob update (Phase 7 cutover).
 *
 * Floor and scoring domains now write to their normalized tables through the
 * floor-ops / scoring-ops endpoints, so the committee JSONB blob PATCH only
 * accepts settings keys. Any other key in `incoming` is ignored. Operators may
 * change all settings; registrars (scoring:edit) may change the scoring-related
 * subset.
 */
export function applyCommitteeDataUpdate(
  current: CommitteeData,
  incoming: Partial<CommitteeData>,
  session: SessionData,
  committeeId: string
): CommitteeData {
  const allowedKeys = canOperateCommittee(session, committeeId)
    ? SETTINGS_DATA_KEYS
    : hasPermission(session, "scoring:edit")
      ? SCORING_SETTINGS_KEYS
      : null;

  if (!allowedKeys) {
    throw new Error("Not authorized to modify committee data");
  }

  const merged = { ...current };
  for (const key of allowedKeys) {
    if (key in incoming) {
      (merged as Record<string, unknown>)[key] =
        incoming[key as keyof CommitteeData];
    }
  }
  return merged;
}
