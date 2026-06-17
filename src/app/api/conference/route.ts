import { eq } from "drizzle-orm";
import { db, committees, conferences } from "@/db";
import {
  authErrorResponse,
  requireAdmin,
  requireSession,
} from "@/lib/session";
import { canAccessAllCommittees } from "@/lib/permissions";
import { parseJsonBody } from "@/lib/api/parse-json-body";

// GET /api/conference
// Returns conference metadata + committee list (scoped to role)
export async function GET() {
  try {
    const session = await requireSession({ refresh: false });

    const [conference] = await db
      .select()
      .from(conferences)
      .where(eq(conferences.id, session.conferenceId))
      .limit(1);

    if (!conference) {
      return Response.json({ error: "Conference not found" }, { status: 404 });
    }

    const allCommittees = await db
      .select({
        id: committees.id,
        name: committees.name,
        type: committees.type,
        topic: committees.topic,
        version: committees.version,
        createdAt: committees.createdAt,
      })
      .from(committees)
      .where(eq(committees.conferenceId, session.conferenceId));

    // Users with access_all see every committee; chairs see only their assignment
    const visibleCommittees = canAccessAllCommittees(session)
      ? allCommittees
      : allCommittees.filter((c) => c.id === session.committeeId);

    return Response.json({ ...conference, committees: visibleCommittees });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// PATCH /api/conference
// Admin only: update conference name/year
export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin();
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const payload = parsed.data as { name?: unknown; year?: unknown };

    const updates: { name?: string; year?: number; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (typeof payload.name === "string" && payload.name.trim()) {
      updates.name = payload.name.trim();
    }
    if (payload.year !== undefined) {
      if (
        typeof payload.year !== "number" ||
        !Number.isInteger(payload.year) ||
        payload.year < 1900 ||
        payload.year > 3000
      ) {
        return Response.json({ error: "Invalid conference year" }, { status: 400 });
      }
      updates.year = payload.year;
    }

    const [updated] = await db
      .update(conferences)
      .set(updates)
      .where(eq(conferences.id, session.conferenceId))
      .returning();

    return Response.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}

// DELETE /api/conference
// Admin only: delete the entire conference (cascades to committees + users)
export async function DELETE() {
  try {
    const session = await requireAdmin();

    await db
      .delete(conferences)
      .where(eq(conferences.id, session.conferenceId));

    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
