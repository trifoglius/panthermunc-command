/**
 * Parses the JSON body of a request, returning either the parsed object or
 * a ready-to-send error Response. Eliminates the repeated try/catch pattern
 * across all route handlers.
 *
 * Usage:
 *   const result = await parseJsonBody(request);
 *   if (!result.ok) return result.response;
 *   const payload = result.data;
 */
export async function parseJsonBody(
  request: Request
): Promise<
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; response: Response }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      response: Response.json({ error: "Invalid request body" }, { status: 400 }),
    };
  }
  return { ok: true, data: body as Record<string, unknown> };
}
