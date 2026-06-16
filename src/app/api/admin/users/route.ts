import { and, eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, committees, users } from "@/db";
import { authErrorResponse, requireAdmin } from "@/lib/session";

// GET /api/admin/users
// List all users for this conference
export async function GET() {
  try {
    const session = await requireAdmin();

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        committeeId: users.committeeId,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.conferenceId, session.conferenceId));

    return Response.json(rows);
  } catch (err) {
    return authErrorResponse(err);
  }
}

// POST /api/admin/users
// Create a new chair (or admin) account
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const payload = body as {
      username?: unknown;
      password?: unknown;
      role?: unknown;
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

    if (payload.role !== "admin" && payload.role !== "chair") {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    if (payload.role === "chair" && !payload.committeeId) {
      return Response.json(
        { error: "committeeId is required for chairs" },
        { status: 400 }
      );
    }

    if (payload.committeeId !== undefined && payload.committeeId !== null) {
      if (typeof payload.committeeId !== "string") {
        return Response.json({ error: "Invalid committeeId" }, { status: 400 });
      }
      const [committee] = await db
        .select({ id: committees.id })
        .from(committees)
        .where(
          and(
            eq(committees.id, payload.committeeId),
            eq(committees.conferenceId, session.conferenceId)
          )
        )
        .limit(1);
      if (!committee) {
        return Response.json({ error: "Committee not found" }, { status: 400 });
      }
    }

    const passwordHash = await hash(payload.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        conferenceId: session.conferenceId,
        username: payload.username.trim().toLowerCase(),
        passwordHash,
        role: payload.role,
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
        committeeId: users.committeeId,
        displayName: users.displayName,
        createdAt: users.createdAt,
      });

    return Response.json(user, { status: 201 });
  } catch (err: unknown) {
    // Unique constraint violation
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
