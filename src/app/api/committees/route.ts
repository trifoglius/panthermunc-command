import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db, committees } from "@/db";
import type { CommitteeData } from "@/db/schema";
import { authErrorResponse, requireAdmin } from "@/lib/session";
import { canAccessAllCommittees } from "@/lib/permissions";
import { DEFAULT_DELEGATES_GA } from "@/lib/constants";
import { createEmptyRubricScore } from "@/lib/scoring";
import type { CommitteeType, Delegate } from "@/lib/types";

// POST /api/committees
// Admin only: create a new committee
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
      name?: unknown;
      type?: unknown;
      withDefaults?: unknown;
      delegates?: unknown;
      topic?: unknown;
    };

    if (typeof payload.name !== "string" || !payload.name.trim()) {
      return Response.json({ error: "Committee name is required" }, { status: 400 });
    }

    const validTypes: CommitteeType[] = ["ga", "crisis", "specialized"];
    if (typeof payload.type !== "string" || !validTypes.includes(payload.type as CommitteeType)) {
      return Response.json({ error: "Invalid committee type" }, { status: 400 });
    }

    // Pre-populate delegates for GA committees when requested
    const delegates: Delegate[] =
      payload.withDefaults && payload.type === "ga"
        ? DEFAULT_DELEGATES_GA.map((country: string) => ({
            id: uuidv4(),
            country,
            delegateName: "",
            positionPaperStatus: "none" as const,
          }))
        : [];

    const type = payload.type as CommitteeType;
    const judgeScores = delegates.map((d) => createEmptyRubricScore(d.id, type));
    const daisScores = delegates.map((d) => createEmptyRubricScore(d.id, type));

    const emptyData: CommitteeData = {
      delegates,
      rollCalls: [],
      motions: [],
      motionQueueHistory: [],
      motionSessionState: {},
      documents: [],
      speakingEvents: [],
      points: [],
      judgeScores,
      daisScores,
      positionPaperScores: [],
      discrepancyThreshold: 10,
      requirePositionPapers: payload.type === "ga",
    };

    const [committee] = await db
      .insert(committees)
      .values({
        conferenceId: session.conferenceId,
        name: payload.name.trim(),
        type: payload.type,
        topic: typeof payload.topic === "string" ? payload.topic.trim() : "",
        data: emptyData,
        version: 0,
      })
      .returning();

    return Response.json(committee, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// GET /api/committees
// Returns summary list (same as in conference route, kept for convenience)
export async function GET() {
  try {
    const { requireSession } = await import("@/lib/session");
    const session = await requireSession();

    const rows = await db
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

    const visible = canAccessAllCommittees(session)
      ? rows
      : rows.filter((c) => c.id === session.committeeId);

    return Response.json(visible);
  } catch (err) {
    return authErrorResponse(err);
  }
}
