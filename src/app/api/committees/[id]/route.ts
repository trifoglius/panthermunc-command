import { and, eq } from "drizzle-orm";
import { db, committees } from "@/db";
import {
  authErrorResponse,
  AuthError,
  requireAdmin,
  requireCommitteeAccess,
} from "@/lib/session";
import { applyCommitteeDataUpdate } from "@/lib/committee-access";
import {
  updateCommittee,
  type CommitteeMutableFields,
} from "@/lib/committee-repo/committee";
import { assembleFloor } from "@/lib/committee-repo/floor-assemble";
import { ensureFloorMigrated } from "@/lib/committee-repo/floor-backfill";
import { assembleScoring } from "@/lib/committee-repo/scoring-assemble";
import { ensureScoringMigrated } from "@/lib/committee-repo/scoring-backfill";
import { canEditCommitteeMetadata } from "@/lib/permissions";
import type { CommitteeData } from "@/db/schema";
import type { CommitteeType } from "@/lib/types";

// GET /api/committees/[id]
// Returns full committee data including JSONB payload.
// Accepts ?ifVersion=<n>: if the stored version equals n, responds with 304 (no body).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireCommitteeAccess(id, { refresh: false });

    let [committee] = await db
      .select()
      .from(committees)
      .where(eq(committees.id, id))
      .limit(1);

    if (!committee) {
      return Response.json({ error: "Committee not found" }, { status: 404 });
    }

    // Lazily normalize floor + scoring data on first access (cheap flag checks
    // avoid a row lock on every poll once migrated).
    if (!committee.floorMigrated) {
      committee = (await ensureFloorMigrated(id)) ?? committee;
    }
    if (!committee.scoringMigrated) {
      committee = (await ensureScoringMigrated(id)) ?? committee;
    }

    const ifVersion = new URL(request.url).searchParams.get("ifVersion");
    if (ifVersion !== null && committee.version === Number(ifVersion)) {
      return new Response(null, { status: 304 });
    }

    const [floor, scoring] = await Promise.all([
      assembleFloor(id),
      assembleScoring(id),
    ]);
    const data: CommitteeData = {
      ...committee.data,
      delegates: floor.delegates,
      motions: floor.motions,
      motionSessionState: floor.motionSessionState,
      motionQueueHistory: floor.motionQueueHistory,
      rollCalls: floor.rollCalls,
      points: floor.points,
      speakingEvents: floor.speakingEvents,
      documents: floor.documents,
      nextDraftSubmissionOrder: committee.nextDraftSubmissionOrder,
      judgeScores: scoring.judgeScores,
      daisScores: scoring.daisScores,
      positionPaperScores: scoring.positionPaperScores,
    };

    return Response.json({
      ...committee,
      data,
      entityVersions: floor.entityVersions,
      scoringEntityVersions: scoring.entityVersions,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

// PATCH /api/committees/[id]
// Update committee data with optimistic concurrency via version field.
// Body: { version: number, data?: Partial<CommitteeData>, name?: string, topic?: string, type?: CommitteeType }
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

    if (typeof body.type === "string") {
      const validTypes: CommitteeType[] = ["ga", "crisis", "specialized"];
      if (!validTypes.includes(body.type as CommitteeType)) {
        return Response.json({ error: "Invalid committee type" }, { status: 400 });
      }
    }

    // The update set is built inside the transaction from the freshly-read row
    // so data merges and permission filtering apply to committed state. Auth
    // failures throw and abort the write; a stale version returns a conflict.
    const result = await updateCommittee(id, body.version, (current) => {
      const fields: CommitteeMutableFields = {};

      if (body.data !== undefined) {
        try {
          fields.data = applyCommitteeDataUpdate(
            current.data,
            body.data,
            session,
            id
          );
        } catch {
          throw new AuthError("Not authorized to modify committee data", 403);
        }
      }
      if (typeof body.name === "string" && body.name.trim()) {
        if (!canEditCommitteeMetadata(session, id)) {
          throw new AuthError("Not authorized to rename committee", 403);
        }
        fields.name = body.name.trim();
      }
      if (typeof body.topic === "string") {
        if (!canEditCommitteeMetadata(session, id)) {
          throw new AuthError("Not authorized to edit committee topic", 403);
        }
        fields.topic = body.topic.trim();
      }
      if (typeof body.type === "string") {
        if (!canEditCommitteeMetadata(session, id)) {
          throw new AuthError("Not authorized to edit committee type", 403);
        }
        fields.type = body.type as CommitteeType;
      }

      return fields;
    });

    if (!result.ok) {
      if (result.reason === "notFound") {
        return Response.json({ error: "Committee not found" }, { status: 404 });
      }
      return Response.json(
        { error: "Conflict: stale version", latest: result.latest },
        { status: 409 }
      );
    }

    return Response.json(result.row);
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
