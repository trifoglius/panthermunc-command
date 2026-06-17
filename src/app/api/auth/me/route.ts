import { authErrorResponse, requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    return Response.json({
      userId: session.userId,
      username: session.username,
      role: session.role,
      permissions: session.permissions,
      conferenceId: session.conferenceId,
      committeeId: session.committeeId,
      displayName: session.displayName,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
