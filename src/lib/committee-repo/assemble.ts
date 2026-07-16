import type { CommitteeRow } from "@/db";
import type { CommitteeData } from "@/db/schema";
import { rowToCommittee } from "@/lib/committee-mappers";
import type { Committee } from "@/lib/types";

/**
 * Build the `CommitteeData` view returned to clients from a committee row.
 *
 * Phase 2: the JSONB blob is still the source of truth, so this is effectively
 * identity over `row.data`. Later phases extend this to prefer normalized
 * tables (delegates, motions, scores, ...) and fall back to the blob during
 * the dual-write rollout, without changing this function's callers.
 */
export function assembleCommitteeData(row: CommitteeRow): CommitteeData {
  return row.data;
}

/** Full committee view (metadata + assembled data) for API responses. */
export function assembleCommittee(row: CommitteeRow): Committee {
  return rowToCommittee({ ...row, data: assembleCommitteeData(row) });
}
