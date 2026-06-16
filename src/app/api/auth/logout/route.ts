import { authErrorResponse, getSession } from "@/lib/session";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
