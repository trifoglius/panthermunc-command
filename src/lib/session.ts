import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import type { SessionData } from "./auth-types";

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
  return session as SessionData;
}

export async function requireAdmin(): Promise<SessionData> {
  const data = await requireSession();
  if (data.role !== "admin") {
    throw new AuthError("Admin access required", 403);
  }
  return data;
}

export async function requireCommitteeAccess(
  committeeId: string
): Promise<SessionData> {
  const data = await requireSession();
  if (data.role === "admin") return data;
  if (data.committeeId !== committeeId) {
    throw new AuthError("Access to this committee is not allowed", 403);
  }
  return data;
}

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
