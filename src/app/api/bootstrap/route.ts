import { hash } from "bcryptjs";
import { db, conferences, users } from "@/db";

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
 * Call once after first deploy:
 *   curl -X POST https://your-domain/api/bootstrap
 */
export async function POST() {
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
