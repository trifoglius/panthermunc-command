import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { authErrorResponse, getSession } from "@/lib/session";
import { normalizePermissions, type UserRole } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { username, password } = body as {
      username?: unknown;
      password?: unknown;
    };

    if (
      typeof username !== "string" ||
      !username.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return Response.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim().toLowerCase()))
      .limit(1);

    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = await getSession();
    const permissions = normalizePermissions(user.permissions ?? []);
    session.userId = user.id;
    session.username = user.username;
    session.role = user.role as UserRole;
    session.permissions = permissions;
    session.conferenceId = user.conferenceId;
    session.committeeId = user.committeeId ?? null;
    session.displayName = user.displayName;
    await session.save();

    return Response.json({
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions,
      committeeId: user.committeeId ?? null,
      displayName: user.displayName,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
