import { and, eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, users } from "@/db";
import { authErrorResponse, requireAdmin } from "@/lib/session";

// PATCH /api/admin/users/[id]
// Update a user's display name, committee assignment, or password
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAdmin();
    const body = await request.json();

    const updates: {
      displayName?: string;
      committeeId?: string | null;
      passwordHash?: string;
    } = {};

    if (typeof body.displayName === "string") {
      updates.displayName = body.displayName.trim();
    }
    if ("committeeId" in body) {
      updates.committeeId = body.committeeId ?? null;
    }
    if (typeof body.password === "string" && body.password) {
      updates.passwordHash = await hash(body.password, 12);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(
        and(
          eq(users.id, id),
          eq(users.conferenceId, session.conferenceId)
        )
      )
      .returning({
        id: users.id,
        username: users.username,
        role: users.role,
        committeeId: users.committeeId,
        displayName: users.displayName,
      });

    if (!updated) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}

// DELETE /api/admin/users/[id]
// Remove a user account
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAdmin();

    // Prevent admin from deleting their own account
    if (id === session.userId) {
      return Response.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.conferenceId, session.conferenceId)
        )
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
