import {
  authErrorResponse,
  AuthError,
  requireCommitteeAccess,
} from "@/lib/session";
import { canEditScoring } from "@/lib/permissions";
import { applyScoringOps } from "@/lib/committee-repo/scoring-ops";
import type { ScoringOp } from "@/lib/committee-sync/scoring-ops-types";

// POST /api/committees/[id]/scoring-ops
// Applies a batch of normalized scoring operations with per-entity optimistic
// concurrency. Requires scoring:edit; decoupled from floor/committee version so
// registrar scoring saves never 409 against concurrent chair floor edits.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireCommitteeAccess(id);

    if (!canEditScoring(session, id)) {
      throw new AuthError("Not authorized to edit scoring for this committee", 403);
    }

    const body = await request.json();
    const ops = body?.ops as ScoringOp[] | undefined;
    if (!Array.isArray(ops)) {
      return Response.json({ error: "ops array is required" }, { status: 400 });
    }

    const result = await applyScoringOps(id, ops);
    if (!result.ok) {
      return Response.json({ error: "Committee not found" }, { status: 404 });
    }

    return Response.json({
      committeeVersion: result.committeeVersion,
      scoringEntityVersions: result.scoringEntityVersions,
      conflict: result.conflict,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
