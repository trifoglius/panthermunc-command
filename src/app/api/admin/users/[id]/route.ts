import { and, eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { db, committees, users } from "@/db";
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
      displayName?: unknown;
      committeeId?: unknown;
      password?: unknown;
    };

    const updates: {
      displayName?: string;
      committeeId?: string | null;
      passwordHash?: string;
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
      updates.committeeId = payload.committeeId ?? null;
    }
    if (typeof payload.password === "string" && payload.password) {
      updates.passwordHash = await hash(payload.password, 12);
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
