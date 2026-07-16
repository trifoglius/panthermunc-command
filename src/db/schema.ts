import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Permission } from "@/lib/permissions";
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
  ScorerRole,
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
  nextDraftSubmissionOrder?: number;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const conferences = pgTable(
  "conferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    year: integer("year").notNull(),
    // Optimistic-concurrency version for metadata edits (Phase 6).
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Singleton guard (Phase 6): an expression unique index on the constant `true`
  // maps every row to the same key, so at most one conference can ever exist.
  // Concurrent bootstraps race here — the loser hits a unique violation (→ 409).
  () => [uniqueIndex("conferences_singleton_idx").on(sql`(true)`)]
);

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
  // Per-domain normalization flags. When false, the JSONB blob is the source of
  // truth for that domain and is lazily backfilled into normalized tables on
  // first access; when true, the normalized tables are authoritative (the blob
  // is still mirrored during rollout as a safety net).
  floorMigrated: boolean("floor_migrated").notNull().default(false),
  // Scoring normalization flag (Phase 5). Decouples registrar scoring writes
  // from chair floor writes so they no longer collide on one shared version.
  scoringMigrated: boolean("scoring_migrated").notNull().default(false),
  // Atomic counter for draft-resolution submission numbers (Phase 4). Assigned
  // server-side inside the floor-ops transaction so concurrent promotions can't
  // collide on the same number.
  nextDraftSubmissionOrder: integer("next_draft_submission_order")
    .notNull()
    .default(0),
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
    role: text("role").notNull(), // "admin" | "chair" | "registrar" | "custom"
    permissions: jsonb("permissions").$type<Permission[]>().notNull().default([]),
    committeeId: uuid("committee_id")
      .references(() => committees.id, { onDelete: "set null" })
      .default(sql`NULL`),
    displayName: text("display_name").notNull().default(""),
    // Optimistic-concurrency version so two admins editing the same user don't
    // silently clobber each other (Phase 6).
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "role_check",
      sql`${t.role} IN ('admin', 'chair', 'registrar', 'custom')`
    ),
  ]
);

// ---------------------------------------------------------------------------
// Normalized floor-operation tables (Phase 3)
//
// Each mutable entity is its own row with a `version` for optimistic
// concurrency, so concurrent chairs editing DIFFERENT entities never collide.
// Append-only collections (speaking events, motion queue history) carry no
// version. Roll-call attendance is an append-only event log resolved by newest
// `recorded_at` at read time — see roll_call_attendance_events.
// ---------------------------------------------------------------------------

export const delegates = pgTable(
  "delegates",
  {
    id: uuid("id").primaryKey(),
    committeeId: uuid("committee_id")
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Delegate>().notNull(),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("delegates_committee_idx").on(t.committeeId, t.createdAt)]
);

export const motions = pgTable(
  "motions",
  {
    id: uuid("id").primaryKey(),
    committeeId: uuid("committee_id")
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Motion>().notNull(),
    sessionState: jsonb("session_state")
      .$type<MotionSessionState>()
      .notNull()
      .default({}),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("motions_committee_idx").on(t.committeeId, t.createdAt)]
);

export const motionQueueHistory = pgTable(
  "motion_queue_history",
  {
    id: uuid("id").primaryKey(),
    committeeId: uuid("committee_id")
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<MotionQueueSnapshot>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("motion_queue_history_committee_idx").on(t.committeeId, t.createdAt),
  ]
);

export const rollCallSessions = pgTable(
  "roll_call_sessions",
  {
    id: uuid("id").primaryKey(),
    committeeId: uuid("committee_id")
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    timestamp: text("timestamp").notNull(),
    quorumMet: boolean("quorum_met").notNull().default(false),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("roll_call_sessions_committee_idx").on(t.committeeId, t.createdAt)]
);

// Append-only attendance log. Every mark is an INSERT (no version, no unique
// constraint on session+delegate), so two chairs marking the same delegate both
// succeed; the newest `recorded_at` wins when the attendance map is rebuilt.
export const rollCallAttendanceEvents = pgTable(
  "roll_call_attendance_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => rollCallSessions.id, { onDelete: "cascade" }),
    delegateId: text("delegate_id").notNull(),
    status: text("status").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    recordedBy: uuid("recorded_by"),
  },
  (t) => [
    index("roll_call_attendance_lookup_idx").on(
      t.sessionId,
      t.delegateId,
      t.recordedAt
    ),
  ]
);

export const points = pgTable(
  "points",
  {
    id: uuid("id").primaryKey(),
    committeeId: uuid("committee_id")
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Point>().notNull(),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("points_committee_idx").on(t.committeeId, t.createdAt)]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey(),
    committeeId: uuid("committee_id")
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Document>().notNull(),
    // Server-assigned draft-resolution submission number (null until assigned).
    submissionNumber: integer("submission_number"),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("documents_committee_idx").on(t.committeeId, t.createdAt)]
);

// Append-only speaking events; no update path today, so no version column.
export const speakingEvents = pgTable(
  "speaking_events",
  {
    id: uuid("id").primaryKey(),
    committeeId: uuid("committee_id")
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<SpeakingEvent>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("speaking_events_committee_idx").on(t.committeeId, t.createdAt)]
);

// ---------------------------------------------------------------------------
// Normalized scoring tables (Phase 5)
//
// Registrar scoring lives in its own rows with per-entity versions so it never
// shares a concurrency unit with chair floor ops. One rubric row per
// (committee, role, delegate); one position-paper row per (committee, delegate).
// ---------------------------------------------------------------------------

export const rubricScores = pgTable(
  "rubric_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    committeeId: uuid("committee_id")
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    role: text("role").$type<ScorerRole>().notNull(), // "judge" | "dais"
    delegateId: text("delegate_id").notNull(),
    data: jsonb("data").$type<RubricScore>().notNull(),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("rubric_scores_unique_idx").on(
      t.committeeId,
      t.role,
      t.delegateId
    ),
    check("rubric_scores_role_check", sql`${t.role} IN ('judge', 'dais')`),
  ]
);

export const positionPaperScores = pgTable(
  "position_paper_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    committeeId: uuid("committee_id")
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    delegateId: text("delegate_id").notNull(),
    data: jsonb("data").$type<PositionPaperScore>().notNull(),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("position_paper_scores_unique_idx").on(
      t.committeeId,
      t.delegateId
    ),
  ]
);

// ---------------------------------------------------------------------------
// Notifications (Phase 6) — persisted so they survive across serverless
// instances instead of living in per-process memory.
// ---------------------------------------------------------------------------

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conferenceId: uuid("conference_id")
      .notNull()
      .references(() => conferences.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    // null = broadcast to every committee; otherwise a list of committee ids.
    committeeIds: jsonb("committee_ids").$type<string[] | null>(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("notifications_conference_idx").on(t.conferenceId, t.createdAt)]
);

// ---------------------------------------------------------------------------
// Inferred row types
// ---------------------------------------------------------------------------

export type Conference = typeof conferences.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type NewConference = typeof conferences.$inferInsert;

export type CommitteeRow = typeof committees.$inferSelect;
export type NewCommitteeRow = typeof committees.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type DelegateRow = typeof delegates.$inferSelect;
export type MotionRow = typeof motions.$inferSelect;
export type MotionQueueHistoryRow = typeof motionQueueHistory.$inferSelect;
export type RollCallSessionRow = typeof rollCallSessions.$inferSelect;
export type RollCallAttendanceEventRow =
  typeof rollCallAttendanceEvents.$inferSelect;
export type PointRow = typeof points.$inferSelect;
export type SpeakingEventRow = typeof speakingEvents.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type RubricScoreRow = typeof rubricScores.$inferSelect;
export type PositionPaperScoreRow = typeof positionPaperScores.$inferSelect;
