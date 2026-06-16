import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import {
  AuthError,
  authErrorResponse,
  getSession,
  requireSession,
} from "@/lib/session";
import { normalizePermissions, type UserRole } from "@/lib/permissions";

export async function GET() {
  try {
    await requireSession();
    const iron = await getSession();
    if (!iron.userId) {
      throw new AuthError("Not authenticated", 401);
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, iron.userId))
      .limit(1);

    if (!user) {
      iron.destroy();
      throw new AuthError("Not authenticated", 401);
    }

    const sessionData = {
      userId: user.id,
      username: user.username,
      role: user.role as UserRole,
      permissions: normalizePermissions(user.permissions ?? []),
      conferenceId: user.conferenceId,
      committeeId: user.committeeId ?? null,
      displayName: user.displayName,
    };

    iron.userId = sessionData.userId;
    iron.username = sessionData.username;
    iron.role = sessionData.role;
    iron.permissions = sessionData.permissions;
    iron.conferenceId = sessionData.conferenceId;
    iron.committeeId = sessionData.committeeId;
    iron.displayName = sessionData.displayName;
    await iron.save();

    return Response.json(sessionData);
  } catch (err) {
    return authErrorResponse(err);
  }
}
