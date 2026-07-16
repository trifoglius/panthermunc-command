import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Neon's serverless driver tunnels interactive (multi-statement) transactions
// over a WebSocket. Node runtimes without a global WebSocket need an explicit
// implementation; browsers / Node 22+ with a global WebSocket use that instead.
if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

export type Database = NeonDatabase<typeof schema>;
/** A transaction handle as passed to `db.transaction(...)` callbacks. */
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Either the base connection or an open transaction — for repo helpers. */
export type DbExecutor = Database | Transaction;

/**
 * Run `fn` inside a single interactive transaction. Repo functions that must
 * read-check-write atomically (optimistic version bumps, atomic counters)
 * should go through this rather than issuing standalone statements.
 */
export function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>
): Promise<T> {
  return db.transaction(fn);
}

export * from "./schema";
