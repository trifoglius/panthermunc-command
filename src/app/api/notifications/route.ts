import { authErrorResponse, hasPermission, requirePermission, requireSession } from "@/lib/session";

export interface Notification {
  id: string;
  message: string;
  committeeIds: string[] | null; // null = all committees
  createdAt: string;
  createdBy: string;
}

// In-process store (survives as long as the serverless instance lives;
// good enough for a single-conference use case).
const store: Notification[] = [];

// POST /api/notifications  (admin only)
// Body: { message: string; committeeIds?: string[] }
export async function POST(request: Request) {
  try {
    const session = await requirePermission("notifications:send");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const payload = body as { message?: unknown; committeeIds?: unknown };

    if (typeof payload.message !== "string" || !payload.message.trim()) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    const committeeIds =
      Array.isArray(payload.committeeIds) &&
      payload.committeeIds.every((id) => typeof id === "string")
        ? (payload.committeeIds as string[])
        : null;

    const notification: Notification = {
      id: crypto.randomUUID(),
      message: payload.message.trim(),
      committeeIds,
      createdAt: new Date().toISOString(),
      createdBy: session.displayName ?? session.username,
    };

    store.unshift(notification);
    // Keep at most 50 notifications
    if (store.length > 50) store.splice(50);

    return Response.json(notification, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// GET /api/notifications?since=<iso>  (any authenticated user)
// Returns notifications relevant to the caller since the given timestamp.
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    let results = store.filter((n) => {
      // Committee filter: null means broadcast to all
      if (n.committeeIds !== null) {
        if (!session.committeeId) return false;
        if (!n.committeeIds.includes(session.committeeId)) return false;
      }
      // Time filter
      if (since && n.createdAt <= since) return false;
      return true;
    });

    // Conference admins see all notifications
    if (hasPermission(session, "committee:access_all")) {
      results = since ? store.filter((n) => n.createdAt > since) : [...store];
    }

    return Response.json(results);
  } catch (err) {
    return authErrorResponse(err);
  }
}

// DELETE /api/notifications/:id  handled below via ?id= to keep one file
export async function DELETE(request: Request) {
  try {
    await requirePermission("notifications:send");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }
    const idx = store.findIndex((n) => n.id === id);
    if (idx === -1) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    store.splice(idx, 1);
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
