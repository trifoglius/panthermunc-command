import type { CommitteeData } from "@/db/schema";
import type { Committee } from "@/lib/types";
import { COMMITTEE_DATA_KEYS } from "@/lib/committee-mappers";

/**
 * Structural equality for JSONB-shaped values. Both sides originate from JSON
 * round-trips of identically constructed objects, so key ordering is stable and
 * a stringify comparison is a correct, cheap deep-equality for our data sizes.
 */
export function deepEqualData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Top-level keys where the server's data differs from the client's last-known
 * clean base. When no base is known, every key is treated as changed so callers
 * fall back to the safe (hard-refresh) path rather than a silent merge.
 */
export function serverChangedKeys(
  base: CommitteeData | undefined,
  server: CommitteeData
): Set<keyof CommitteeData> {
  const changed = new Set<keyof CommitteeData>();
  for (const key of COMMITTEE_DATA_KEYS) {
    if (!base || !deepEqualData(base[key], server[key])) {
      changed.add(key);
    }
  }
  return changed;
}

/** Intersection of two committee-data key sets. */
export function intersectKeys(
  a: Set<keyof CommitteeData>,
  b: Set<keyof CommitteeData>
): Set<keyof CommitteeData> {
  const out = new Set<keyof CommitteeData>();
  for (const key of a) {
    if (b.has(key)) out.add(key);
  }
  return out;
}

/**
 * Adopt server values for every key that is NOT locally dirty, preserving the
 * client's unsaved edits on dirty keys. Used for disjoint-key rebase (409) and
 * dirty-aware polling.
 */
export function mergeServerIntoLocal(
  local: Committee,
  serverData: CommitteeData,
  dirty: Set<keyof CommitteeData>
): Committee {
  const merged: Committee = { ...local };
  for (const key of COMMITTEE_DATA_KEYS) {
    if (!dirty.has(key)) {
      (merged as unknown as Record<string, unknown>)[key] = serverData[key];
    }
  }
  return merged;
}
