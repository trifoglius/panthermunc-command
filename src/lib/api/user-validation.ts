import { and, eq } from "drizzle-orm";
import { db, committees } from "@/db";
import {
  normalizePermissions,
  permissionsForRole,
  type Permission,
  type UserRole,
} from "@/lib/permissions";

export function isUserRole(value: unknown): value is UserRole {
  return (
    value === "admin" ||
    value === "chair" ||
    value === "registrar" ||
    value === "custom"
  );
}

export function parsePermissions(role: UserRole, raw?: unknown): Permission[] {
  if (Array.isArray(raw)) {
    return normalizePermissions(raw.filter((p) => typeof p === "string"));
  }
  return permissionsForRole(role);
}

/**
 * Verifies that `committeeId` belongs to `conferenceId`.
 * Returns a ready-to-send 400 Response if the committee is not found,
 * or null if the check passes.
 */
export async function assertCommitteeInConference(
  committeeId: string,
  conferenceId: string
): Promise<Response | null> {
  const [committee] = await db
    .select({ id: committees.id })
    .from(committees)
    .where(
      and(
        eq(committees.id, committeeId),
        eq(committees.conferenceId, conferenceId)
      )
    )
    .limit(1);

  if (!committee) {
    return Response.json({ error: "Committee not found" }, { status: 400 });
  }
  return null;
}
