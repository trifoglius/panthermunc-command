import { and, eq, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, users } from "@/db";
import { authErrorResponse, requirePermission } from "@/lib/session";
import {
  detectRoleFromPermissions,
  normalizePermissions,
  type Permission,
  type UserRole,
} from "@/lib/permissions";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import {
  assertCommitteeInConference,
  isUserRole,
} from "@/lib/api/user-validation";

// PATCH /api/admin/users/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requirePermission("users:manage");
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const payload = parsed.data as {
      displayName?: unknown;
      committeeId?: unknown;
      password?: unknown;
      role?: unknown;
      permissions?: unknown;
      version?: unknown;
    };

    const updates: {
      displayName?: string;
      committeeId?: string | null;
      passwordHash?: string;
      role?: UserRole;
      permissions?: Permission[];
      version?: ReturnType<typeof sql>;
    } = {};

    if (typeof payload.displayName === "string") {
      updates.displayName = payload.displayName.trim();
    }
    if ("committeeId" in payload) {
      if (
        payload.committeeId !== null &&
        payload.committeeId !== undefined &&
        typeof payload.committeeId !== "string"
      ) {
        return Response.json({ error: "Invalid committeeId" }, { status: 400 });
      }
      if (typeof payload.committeeId === "string") {
        const err = await assertCommitteeInConference(
          payload.committeeId,
          session.conferenceId
        );
        if (err) return err;
      }
      updates.committeeId = payload.committeeId ?? null;
    }
    if (typeof payload.password === "string" && payload.password) {
      updates.passwordHash = await hash(payload.password, 12);
    }
    if (Array.isArray(payload.permissions)) {
      const permissions = normalizePermissions(
        payload.permissions.filter((p) => typeof p === "string")
      );
      if (permissions.length === 0) {
        return Response.json(
          { error: "At least one permission is required" },
          { status: 400 }
        );
      }
      updates.permissions = permissions;
      updates.role = isUserRole(payload.role)
        ? payload.role === "custom"
          ? detectRoleFromPermissions(permissions)
          : payload.role
        : detectRoleFromPermissions(permissions);
    } else if (isUserRole(payload.role)) {
      updates.role = payload.role;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Optimistic concurrency when a version is supplied; two admins editing the
    // same user then can't silently overwrite one another.
    const expectedVersion =
      typeof payload.version === "number" ? payload.version : undefined;
    updates.version = sql`${users.version} + 1`;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(
        expectedVersion !== undefined
          ? and(
              eq(users.id, id),
              eq(users.conferenceId, session.conferenceId),
              eq(users.version, expectedVersion)
            )
          : and(eq(users.id, id), eq(users.conferenceId, session.conferenceId))
      )
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        permissions: users.permissions,
        committeeId: users.committeeId,
        displayName: users.displayName,
        version: users.version,
      });

    if (!updated) {
      if (expectedVersion !== undefined) {
        const [latest] = await db
          .select({
            id: users.id,
            username: users.username,
            role: users.role,
            permissions: users.permissions,
            committeeId: users.committeeId,
            displayName: users.displayName,
            version: users.version,
          })
          .from(users)
          .where(
            and(eq(users.id, id), eq(users.conferenceId, session.conferenceId))
          )
          .limit(1);
        if (latest) {
          return Response.json(
            {
              error: "Conflict: stale version",
              latest: {
                ...latest,
                permissions: normalizePermissions(latest.permissions ?? []),
              },
            },
            { status: 409 }
          );
        }
      }
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      ...updated,
      permissions: normalizePermissions(updated.permissions ?? []),
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// DELETE /api/admin/users/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requirePermission("users:manage");

    if (id === session.userId) {
      return Response.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(users)
      .where(
        and(eq(users.id, id), eq(users.conferenceId, session.conferenceId))
      )
      .returning({ id: users.id });

    if (!deleted.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
