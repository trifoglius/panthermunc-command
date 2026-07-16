import {
  authErrorResponse,
  AuthError,
  requireCommitteeAccess,
} from "@/lib/session";
import { canOperateCommittee } from "@/lib/permissions";
import { applyFloorOps } from "@/lib/committee-repo/floor-ops";
import type { FloorOp } from "@/lib/committee-sync/floor-ops-types";

// POST /api/committees/[id]/floor-ops
// Applies a batch of normalized floor operations with per-entity optimistic
// concurrency. Floor operations (including points) require committee:operate,
// so registrars (scoring-only) cannot write floor data.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await requireCommitteeAccess(id);

    if (!canOperateCommittee(session, id)) {
      throw new AuthError("Not authorized to operate this committee", 403);
    }

    const body = await request.json();
    const ops = body?.ops as FloorOp[] | undefined;
    if (!Array.isArray(ops)) {
      return Response.json({ error: "ops array is required" }, { status: 400 });
    }

    const result = await applyFloorOps(id, session.userId, ops);
    if (!result.ok) {
      return Response.json({ error: "Committee not found" }, { status: 404 });
    }

    return Response.json({
      committeeVersion: result.committeeVersion,
      entityVersions: result.entityVersions,
      conflict: result.conflict,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
