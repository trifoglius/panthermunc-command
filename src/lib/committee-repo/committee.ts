import { and, eq } from "drizzle-orm";
import {
  committees,
  db,
  withTransaction,
  type CommitteeRow,
  type DbExecutor,
} from "@/db";
import type { CommitteeData } from "@/db/schema";
import type { CommitteeType } from "@/lib/types";
import type { CommitteeWriteResult } from "./types";

/** Fields of a committee row that a write may set (version is managed here). */
export type CommitteeMutableFields = {
  data?: CommitteeData;
  name?: string;
  topic?: string;
  type?: CommitteeType;
};

export async function getCommittee(
  id: string,
  executor: DbExecutor = db
): Promise<CommitteeRow | undefined> {
  const [row] = await executor
    .select()
    .from(committees)
    .where(eq(committees.id, id))
    .limit(1);
  return row;
}

/**
 * Optimistic, transactional committee update.
 *
 * Reads the current row inside a transaction, verifies `expectedVersion`, then
 * builds the update set from the fresh row (so field-level merges/permission
 * filtering operate on committed state) and writes with a version guard. The
 * `build` callback may throw (e.g. `RepoAuthError`) to abort the write.
 *
 * Returns a `conflict` result carrying the latest row when the version is
 * stale, or `notFound` when the committee no longer exists.
 */
export async function updateCommittee(
  id: string,
  expectedVersion: number,
  build: (current: CommitteeRow) => CommitteeMutableFields
): Promise<CommitteeWriteResult> {
  return withTransaction(async (tx) => {
    const current = await getCommittee(id, tx);
    if (!current) return { ok: false, reason: "notFound" };
    if (current.version !== expectedVersion) {
      return { ok: false, reason: "conflict", latest: current };
    }

    const fields = build(current);

    const [updated] = await tx
      .update(committees)
      .set({ ...fields, version: current.version + 1, updatedAt: new Date() })
      .where(
        and(eq(committees.id, id), eq(committees.version, expectedVersion))
      )
      .returning();

    if (!updated) {
      const latest = await getCommittee(id, tx);
      if (!latest) return { ok: false, reason: "notFound" };
      return { ok: false, reason: "conflict", latest };
    }

    return { ok: true, row: updated };
  });
}
