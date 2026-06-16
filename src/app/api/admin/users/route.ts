import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, users } from "@/db";
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
    const body = await request.json();

    if (!body.username?.trim() || !body.password) {
      return Response.json(
        { error: "username and password are required" },
        { status: 400 }
      );
    }

    if (!["admin", "chair"].includes(body.role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    if (body.role === "chair" && !body.committeeId) {
      return Response.json(
        { error: "committeeId is required for chairs" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(body.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        conferenceId: session.conferenceId,
        username: body.username.trim().toLowerCase(),
        passwordHash,
        role: body.role,
        committeeId: body.committeeId ?? null,
        displayName: body.displayName?.trim() ?? body.username.trim(),
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
