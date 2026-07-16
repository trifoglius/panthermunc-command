import { timingSafeEqual } from "crypto";
import { hash } from "bcryptjs";
import { db, conferences, users, withTransaction } from "@/db";
import { ROLE_TEMPLATES } from "@/lib/permissions";
import { parseJsonBody } from "@/lib/api/parse-json-body";

/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

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
  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const providedPassword = parsed.data.password;
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

  // Fast-path guard for the common "already set up" case. The authoritative
  // guard against concurrent bootstraps is the singleton unique index below,
  // which turns a lost race into a unique violation we map to 409.
  const existing = await db.select().from(conferences).limit(1);
  if (existing.length > 0) {
    return Response.json({ error: "Already bootstrapped" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);

  try {
    const result = await withTransaction(async (tx) => {
      const [conference] = await tx
        .insert(conferences)
        .values({
          name: "PantherMUNC",
          year: new Date().getFullYear(),
        })
        .returning();

      const [admin] = await tx
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

      return { conferenceId: conference.id, admin };
    });

    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    // Lost the singleton race (or a duplicate username): another bootstrap won.
    if (isUniqueViolation(err)) {
      return Response.json({ error: "Already bootstrapped" }, { status: 409 });
    }
    throw err;
  }
}
