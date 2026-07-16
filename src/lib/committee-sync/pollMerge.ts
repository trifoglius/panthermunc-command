import type { CommitteeData } from "@/db/schema";
import { intersectKeys, serverChangedKeys } from "./conflict";

/**
 * How a fresh server snapshot should be reconciled with local unsaved edits.
 * - `replace`: no local edits, adopt the server row wholesale.
 * - `merge`: disjoint keys, keep dirty edits and adopt non-dirty server keys.
 * - `conflict`: server changed a key we are also editing, must hard-refresh.
 */
export type ServerUpdateClass = "replace" | "merge" | "conflict";

/**
 * Shared reconciliation decision used by BOTH polling and 409 save handling so
 * their conflict policy cannot drift. `base` is the client's last-known clean
 * server snapshot; `dirty` is the set of locally edited top-level keys.
 */
export function classifyServerUpdate(
  base: CommitteeData | undefined,
  server: CommitteeData,
  dirty: Set<keyof CommitteeData>
): ServerUpdateClass {
  if (dirty.size === 0) return "replace";
  const changed = serverChangedKeys(base, server);
  const overlap = intersectKeys(dirty, changed);
  return overlap.size > 0 ? "conflict" : "merge";
}
