import { timingSafeEqual } from "crypto";
import { hash } from "bcryptjs";
import { db, conferences, users } from "@/db";
import { ROLE_TEMPLATES } from "@/lib/permissions";

function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/bootstrap
 *
 * One-time endpoint: creates the initial conference and admin account from
 * env vars. Returns 409 if a conference already exists (safe to call again).
 *
 * Required env vars:
 *   BOOTSTRAP_ADMIN_USERNAME
 *   BOOTSTRAP_ADMIN_PASSWORD
 *
 * Body: { password: string } — must match BOOTSTRAP_ADMIN_PASSWORD
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const providedPassword = (body as { password?: unknown }).password;
  if (typeof providedPassword !== "string" || !providedPassword) {
    return Response.json(
      { error: "Bootstrap admin password is required" },
      { status: 400 }
    );
  }

  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!username || !password) {
    return Response.json(
      {
        error:
          "BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD must be set",
      },
      { status: 500 }
    );
  }

  if (!secureCompare(providedPassword, password)) {
    return Response.json({ error: "Invalid bootstrap password" }, { status: 403 });
  }

  // Guard: do not allow re-bootstrapping if a conference already exists
  const existing = await db.select().from(conferences).limit(1);
  if (existing.length > 0) {
    return Response.json(
      { error: "Already bootstrapped" },
      { status: 409 }
    );
  }

  const [conference] = await db
    .insert(conferences)
    .values({
      name: "PantherMUNC",
      year: new Date().getFullYear(),
    })
    .returning();

  const passwordHash = await hash(password, 12);

  const [admin] = await db
    .insert(users)
    .values({
      conferenceId: conference.id,
      username: username.trim().toLowerCase(),
      passwordHash,
      role: "admin",
      permissions: ROLE_TEMPLATES.admin,
      committeeId: null,
      displayName: username.trim(),
    })
    .returning({
      id: users.id,
      username: users.username,
      role: users.role,
    });

  return Response.json(
    {
      ok: true,
      conferenceId: conference.id,
      admin,
    },
    { status: 201 }
  );
}
