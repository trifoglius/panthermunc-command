import { authErrorResponse, requireSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireSession();
    return Response.json(session);
  } catch (err) {
    return authErrorResponse(err);
  }
}
