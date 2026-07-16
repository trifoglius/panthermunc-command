import { eq } from "drizzle-orm";
import { db, committees } from "@/db";
import { authErrorResponse, requireSession } from "@/lib/session";
import { canAccessAllCommittees } from "@/lib/permissions";

// GET /api/conference/versions
// Lightweight endpoint returning only id + version for the caller's VISIBLE
// committees. Clients use this to determine which committees have changed before
// fetching full data. Scoped like GET /api/conference so chairs don't learn
// about committees they can't access.
export async function GET() {
  try {
    const session = await requireSession({ refresh: false });

    const rows = await db
      .select({
        id: committees.id,
        version: committees.version,
        updatedAt: committees.updatedAt,
      })
      .from(committees)
      .where(eq(committees.conferenceId, session.conferenceId));

    const visible = canAccessAllCommittees(session)
      ? rows
      : rows.filter((c) => c.id === session.committeeId);

    return Response.json({ committees: visible });
  } catch (err) {
    return authErrorResponse(err);
  }
}
