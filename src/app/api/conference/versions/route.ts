import { eq } from "drizzle-orm";
import { db, committees } from "@/db";
import { authErrorResponse, requireSession } from "@/lib/session";

// GET /api/conference/versions
// Lightweight endpoint returning only id + version for all visible committees.
// Clients use this to determine which committees have changed before fetching full data.
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

    return Response.json({ committees: rows });
  } catch (err) {
    return authErrorResponse(err);
  }
}
