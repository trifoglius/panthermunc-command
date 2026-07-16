import { and, desc, eq, gt } from "drizzle-orm";
import { db, notifications } from "@/db";
import {
  authErrorResponse,
  hasPermission,
  requirePermission,
  requireSession,
} from "@/lib/session";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import type { NotificationItem } from "@/lib/types";

const MAX_RESULTS = 50;

function toItem(row: typeof notifications.$inferSelect): NotificationItem {
  return {
    id: row.id,
    message: row.message,
    committeeIds: row.committeeIds ?? null,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    createdBy: row.createdBy,
  };
}

// POST /api/notifications  (notifications:send)
// Body: { message: string; committeeIds?: string[] }
export async function POST(request: Request) {
  try {
    const session = await requirePermission("notifications:send");
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const payload = parsed.data as { message?: unknown; committeeIds?: unknown };

    if (typeof payload.message !== "string" || !payload.message.trim()) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    const committeeIds =
      Array.isArray(payload.committeeIds) &&
      payload.committeeIds.every((id) => typeof id === "string")
        ? (payload.committeeIds as string[])
        : null;

    const [row] = await db
      .insert(notifications)
      .values({
        conferenceId: session.conferenceId,
        message: payload.message.trim(),
        committeeIds,
        createdBy: session.displayName ?? session.username,
      })
      .returning();

    return Response.json(toItem(row), { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// GET /api/notifications?since=<iso>  (any authenticated user)
// Returns notifications relevant to the caller since the given timestamp.
export async function GET(request: Request) {
  try {
    const session = await requireSession({ refresh: false });
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    const sinceDate = since ? new Date(since) : null;
    const validSince =
      sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate : null;

    const rows = await db
      .select()
      .from(notifications)
      .where(
        validSince
          ? and(
              eq(notifications.conferenceId, session.conferenceId),
              gt(notifications.createdAt, validSince)
            )
          : eq(notifications.conferenceId, session.conferenceId)
      )
      .orderBy(desc(notifications.createdAt))
      .limit(MAX_RESULTS);

    // Conference-wide viewers see everything; otherwise filter to broadcasts and
    // notifications targeting the caller's committee.
    const canSeeAll = hasPermission(session, "committee:access_all");
    const results = rows
      .filter((row) => {
        if (canSeeAll) return true;
        if (row.committeeIds === null) return true;
        if (!session.committeeId) return false;
        return row.committeeIds.includes(session.committeeId);
      })
      .map(toItem);

    return Response.json(results);
  } catch (err) {
    return authErrorResponse(err);
  }
}

// DELETE /api/notifications?id=<id>  (notifications:send)
export async function DELETE(request: Request) {
  try {
    const session = await requirePermission("notifications:send");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const deleted = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.conferenceId, session.conferenceId)
        )
      )
      .returning({ id: notifications.id });

    if (!deleted.length) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
