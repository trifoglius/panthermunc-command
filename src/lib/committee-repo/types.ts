import type { CommitteeRow } from "@/db";

/**
 * Result of an optimistic, version-checked write. Conflicts are returned (with
 * the latest server row so the client can reconcile) rather than thrown, so
 * callers can map them to a 409 without try/catch control flow.
 */
export type CommitteeWriteResult =
  | { ok: true; row: CommitteeRow }
  | { ok: false; reason: "conflict"; latest: CommitteeRow }
  | { ok: false; reason: "notFound" };

/** Thrown by repo `build` callbacks when the session may not perform the write. */
export class RepoAuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}
