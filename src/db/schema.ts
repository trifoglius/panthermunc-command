import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  Delegate,
  RollCallSession,
  Motion,
  MotionQueueSnapshot,
  MotionSessionState,
  Document,
  SpeakingEvent,
  Point,
  RubricScore,
  PositionPaperScore,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// committees.data shape stored in JSONB
// ---------------------------------------------------------------------------
export interface CommitteeData {
  delegates: Delegate[];
  rollCalls: RollCallSession[];
  motions: Motion[];
  motionQueueHistory: MotionQueueSnapshot[];
  motionSessionState: Record<string, MotionSessionState>;
  documents: Document[];
  speakingEvents: SpeakingEvent[];
  points: Point[];
  judgeScores: RubricScore[];
  daisScores: RubricScore[];
  positionPaperScores: PositionPaperScore[];
  vcRecipientId?: string;
  discrepancyThreshold: number;
  requirePositionPapers: boolean;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const conferences = pgTable("conferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const committees = pgTable("committees", {
  id: uuid("id").primaryKey().defaultRandom(),
  conferenceId: uuid("conference_id")
    .notNull()
    .references(() => conferences.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // "ga" | "crisis" | "specialized"
  topic: text("topic").notNull().default(""),
  data: jsonb("data").$type<CommitteeData>().notNull(),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conferenceId: uuid("conference_id")
      .notNull()
      .references(() => conferences.id, { onDelete: "cascade" }),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(), // "admin" | "chair"
    committeeId: uuid("committee_id")
      .references(() => committees.id, { onDelete: "set null" })
      .default(sql`NULL`),
    displayName: text("display_name").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("role_check", sql`${t.role} IN ('admin', 'chair')`)]
);

// ---------------------------------------------------------------------------
// Inferred row types
// ---------------------------------------------------------------------------

export type Conference = typeof conferences.$inferSelect;
export type NewConference = typeof conferences.$inferInsert;

export type Committee = typeof committees.$inferSelect;
export type NewCommittee = typeof committees.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
