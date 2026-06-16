import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db, committees } from "@/db";
import type { CommitteeData } from "@/db/schema";
import { authErrorResponse, requireAdmin } from "@/lib/session";
import { DEFAULT_DELEGATES_GA } from "@/lib/constants";
import { createEmptyRubricScore } from "@/lib/scoring";
import type { CommitteeType, Delegate } from "@/lib/types";

// POST /api/committees
// Admin only: create a new committee
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    if (!body.name?.trim()) {
      return Response.json({ error: "Committee name is required" }, { status: 400 });
    }

    const validTypes: CommitteeType[] = ["ga", "crisis", "specialized"];
    if (!validTypes.includes(body.type)) {
      return Response.json({ error: "Invalid committee type" }, { status: 400 });
    }

    // Pre-populate delegates for GA committees when requested
    const delegates: Delegate[] =
      body.withDefaults && body.type === "ga"
        ? DEFAULT_DELEGATES_GA.map((country: string) => ({
            id: uuidv4(),
            country,
            delegateName: "",
            positionPaperStatus: "none" as const,
          }))
        : (body.delegates ?? []);

    const type = body.type as CommitteeType;
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
      requirePositionPapers: body.type === "ga",
    };

    const [committee] = await db
      .insert(committees)
      .values({
        conferenceId: session.conferenceId,
        name: body.name.trim(),
        type: body.type,
        topic: body.topic?.trim() ?? "",
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

    const visible =
      session.role === "admin"
        ? rows
        : rows.filter((c) => c.id === session.committeeId);

    return Response.json(visible);
  } catch (err) {
    return authErrorResponse(err);
  }
}
