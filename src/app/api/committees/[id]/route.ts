import { and, eq } from "drizzle-orm";
import { db, committees } from "@/db";
import type { CommitteeData } from "@/db/schema";
import {
  authErrorResponse,
  AuthError,
  requireAdmin,
  requireCommitteeAccess,
} from "@/lib/session";
import { applyCommitteeDataUpdate } from "@/lib/committee-access";
import { canOperateCommittee } from "@/lib/permissions";

// GET /api/committees/[id]
// Returns full committee data including JSONB payload
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCommitteeAccess(id);

    const [committee] = await db
      .select()
      .from(committees)
      .where(eq(committees.id, id))
      .limit(1);

    if (!committee) {
      return Response.json({ error: "Committee not found" }, { status: 404 });
    }

    return Response.json(committee);
  } catch (err) {
    return authErrorResponse(err);
  }
}

// PATCH /api/committees/[id]
// Update committee data with optimistic concurrency via version field.
// Body: { version: number, data?: Partial<CommitteeData>, name?: string, topic?: string }
// Returns 409 if the client's version is stale.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireCommitteeAccess(id);

    const body = await request.json();

    if (typeof body.version !== "number") {
      return Response.json({ error: "version is required" }, { status: 400 });
    }

    // Fetch current row to check version
    const [current] = await db
      .select()
      .from(committees)
      .where(eq(committees.id, id))
      .limit(1);

    if (!current) {
      return Response.json({ error: "Committee not found" }, { status: 404 });
    }

    if (current.version !== body.version) {
      // Return latest data so client can reconcile
      return Response.json(
        { error: "Conflict: stale version", latest: current },
        { status: 409 }
      );
    }

    const updates: {
      version: number;
      updatedAt: Date;
      data?: CommitteeData;
      name?: string;
      topic?: string;
    } = {
      version: current.version + 1,
      updatedAt: new Date(),
    };

    if (body.data !== undefined) {
      try {
        updates.data = applyCommitteeDataUpdate(
          current.data,
          body.data as Partial<CommitteeData>,
          session,
          id
        );
      } catch {
        throw new AuthError("Not authorized to modify committee data", 403);
      }
    }
    if (typeof body.name === "string" && body.name.trim()) {
      if (!canOperateCommittee(session, id)) {
        throw new AuthError("Not authorized to rename committee", 403);
      }
      updates.name = body.name.trim();
    }
    if (typeof body.topic === "string") {
      if (!canOperateCommittee(session, id)) {
        throw new AuthError("Not authorized to edit committee topic", 403);
      }
      updates.topic = body.topic.trim();
    }

    const [updated] = await db
      .update(committees)
      .set(updates)
      .where(
        and(eq(committees.id, id), eq(committees.version, body.version))
      )
      .returning();

    if (!updated) {
      // Another request snuck in between our read and write
      const [latest] = await db
        .select()
        .from(committees)
        .where(eq(committees.id, id))
        .limit(1);
      return Response.json(
        { error: "Conflict: concurrent write", latest },
        { status: 409 }
      );
    }

    return Response.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}

// DELETE /api/committees/[id]
// Admin only: remove a committee
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireAdmin();

    const deleted = await db
      .delete(committees)
      .where(
        and(
          eq(committees.id, id),
          eq(committees.conferenceId, session.conferenceId)
        )
      )
      .returning({ id: committees.id });

    if (!deleted.length) {
      return Response.json({ error: "Committee not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
