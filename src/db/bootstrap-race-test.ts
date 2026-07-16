/**
 * Bootstrap singleton race test (Phase 6 exit criterion).
 *
 * Run with: npx tsx src/db/bootstrap-race-test.ts
 *
 * Fires two concurrent conference inserts against the REAL Neon-backed DB (Pool,
 * not mocked HTTP) to prove the singleton unique index `((true))` guarantees at
 * most one conference. Exactly one insert must succeed; the loser must fail with
 * a Postgres unique_violation (SQLSTATE 23505) — which the bootstrap route maps
 * to a 409.
 *
 * Safety: aborts if any conference already exists (the singleton means we can
 * only exercise the race on an empty conferences table, e.g. a scratch/test DB).
 * Cleans up the row it creates on success.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import { conferences } from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}
if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema: { conferences } });

  const existing = await db.select().from(conferences).limit(1);
  if (existing.length > 0) {
    console.error(
      "ABORT: a conference already exists. Run this only against an empty DB."
    );
    await pool.end();
    process.exit(1);
  }

  const insertOne = () =>
    db
      .insert(conferences)
      .values({ name: "RaceTest", year: 2026 })
      .returning({ id: conferences.id })
      .then((rows) => ({ ok: true as const, id: rows[0].id }))
      .catch((err) => ({ ok: false as const, err }));

  const [a, b] = await Promise.all([insertOne(), insertOne()]);
  const successes = [a, b].filter((r) => r.ok);
  const failures = [a, b].filter((r) => !r.ok);

  const rows = await db.select().from(conferences);

  let pass = true;
  if (successes.length !== 1) {
    console.error(`FAIL: expected exactly 1 success, got ${successes.length}`);
    pass = false;
  }
  if (rows.length !== 1) {
    console.error(`FAIL: expected exactly 1 conference row, got ${rows.length}`);
    pass = false;
  }
  if (failures.length !== 1 || !isUniqueViolation((failures[0] as { err: unknown }).err)) {
    console.error("FAIL: loser did not fail with a unique_violation (23505)");
    pass = false;
  }

  // Cleanup the row we created.
  await db.delete(conferences).where(sql`true`);
  await pool.end();

  if (pass) {
    console.log("PASS: singleton race produced one conference; loser got 23505 → 409.");
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Race test error:", err);
  process.exit(1);
});
