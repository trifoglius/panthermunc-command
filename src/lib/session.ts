import { getIronSession, type IronSession } from "iron-session";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, users } from "@/db";
import type { SessionData } from "./auth-types";
import {
  hasAnyPermission,
  hasPermission,
  normalizePermissions,
  type Permission,
  type UserRole,
} from "./permissions";

export type { SessionData };

const SESSION_OPTIONS = {
  password: process.env.AUTH_SECRET ?? "dev-secret-change-before-deploy-32ch",
  cookieName: "panthermunc_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24, // 24 hours
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) {
    throw new AuthError("Not authenticated", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    session.destroy();
    throw new AuthError("Not authenticated", 401);
  }

  session.username = user.username;
  session.role = user.role as UserRole;
  session.permissions = normalizePermissions(user.permissions ?? []);
  session.conferenceId = user.conferenceId;
  session.committeeId = user.committeeId ?? null;
  session.displayName = user.displayName;
  await session.save();

  return session as SessionData;
}

export async function requirePermission(
  ...perms: Permission[]
): Promise<SessionData> {
  const data = await requireSession();
  if (!hasAnyPermission(data, perms)) {
    throw new AuthError("Insufficient permissions", 403);
  }
  return data;
}

/** Conference-wide administration (settings, committees, bootstrap recovery). */
export async function requireAdmin(): Promise<SessionData> {
  return requirePermission("conference:manage");
}

export async function requireCommitteeAccess(
  committeeId: string
): Promise<SessionData> {
  const data = await requireSession();
  if (hasPermission(data, "committee:access_all")) return data;
  if (data.committeeId === committeeId) return data;
  throw new AuthError("Access to this committee is not allowed", 403);
}

export { hasPermission, hasAnyPermission };

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function authErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
