import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, users } from "@/db";
import { authErrorResponse, requirePermission } from "@/lib/session";
import {
  detectRoleFromPermissions,
  normalizePermissions,
} from "@/lib/permissions";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import {
  assertCommitteeInConference,
  isUserRole,
  parsePermissions,
} from "@/lib/api/user-validation";

// GET /api/admin/users
export async function GET() {
  try {
    const session = await requirePermission("users:manage");

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        permissions: users.permissions,
        committeeId: users.committeeId,
        displayName: users.displayName,
        version: users.version,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.conferenceId, session.conferenceId));

    return Response.json(
      rows.map((row) => ({
        ...row,
        permissions: normalizePermissions(row.permissions ?? []),
      }))
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}

// POST /api/admin/users
export async function POST(request: Request) {
  try {
    const session = await requirePermission("users:manage");
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const payload = parsed.data as {
      username?: unknown;
      password?: unknown;
      role?: unknown;
      permissions?: unknown;
      committeeId?: unknown;
      displayName?: unknown;
    };

    if (
      typeof payload.username !== "string" ||
      !payload.username.trim() ||
      typeof payload.password !== "string" ||
      !payload.password
    ) {
      return Response.json(
        { error: "username and password are required" },
        { status: 400 }
      );
    }

    if (!isUserRole(payload.role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    const role = payload.role;
    const permissions = parsePermissions(role, payload.permissions);

    if (permissions.length === 0) {
      return Response.json(
        { error: "At least one permission is required" },
        { status: 400 }
      );
    }

    const needsCommittee =
      role === "chair" ||
      (permissions.includes("committee:operate") &&
        !permissions.includes("committee:access_all"));

    if (needsCommittee && !payload.committeeId) {
      return Response.json(
        { error: "committeeId is required for committee-scoped users" },
        { status: 400 }
      );
    }

    if (payload.committeeId !== undefined && payload.committeeId !== null) {
      if (typeof payload.committeeId !== "string") {
        return Response.json({ error: "Invalid committeeId" }, { status: 400 });
      }
      const err = await assertCommitteeInConference(
        payload.committeeId,
        session.conferenceId
      );
      if (err) return err;
    }

    const storedRole =
      role === "custom" ? detectRoleFromPermissions(permissions) : role;

    const passwordHash = await hash(payload.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        conferenceId: session.conferenceId,
        username: payload.username.trim().toLowerCase(),
        passwordHash,
        role: storedRole,
        permissions,
        committeeId:
          typeof payload.committeeId === "string" ? payload.committeeId : null,
        displayName:
          typeof payload.displayName === "string" && payload.displayName.trim()
            ? payload.displayName.trim()
            : payload.username.trim(),
      })
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        permissions: users.permissions,
        committeeId: users.committeeId,
        displayName: users.displayName,
        version: users.version,
        createdAt: users.createdAt,
      });

    return Response.json(
      {
        ...user,
        permissions: normalizePermissions(user.permissions ?? []),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("users_username_unique")
    ) {
      return Response.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }
    return authErrorResponse(err);
  }
}
