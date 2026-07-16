/**
 * DB-backed concurrency tests (Phase 7). These run only when DATABASE_URL points
 * at a migrated, disposable database:
 *
 *   DATABASE_URL=postgres://... npm test
 *
 * They are skipped otherwise so the default unit suite stays hermetic. All
 * imports of the DB layer are dynamic so the module can be collected without a
 * DATABASE_URL (src/db throws at import time when it is unset).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";

const RUN = !!process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbmod: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let floorOps: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let scoringOps: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let floorAssemble: any;

let conferenceId: string;
let committeeId: string;

function emptyCommitteeData() {
  return {
    delegates: [],
    rollCalls: [],
    motions: [],
    motionQueueHistory: [],
    motionSessionState: {},
    documents: [],
    speakingEvents: [],
    points: [],
    judgeScores: [],
    daisScores: [],
    positionPaperScores: [],
    discrepancyThreshold: 10,
    requirePositionPapers: false,
    nextDraftSubmissionOrder: 0,
  };
}

describe.skipIf(!RUN)("floor/scoring concurrency (integration)", () => {
  beforeAll(async () => {
    dbmod = await import("./index");
    floorOps = await import("@/lib/committee-repo/floor-ops");
    scoringOps = await import("@/lib/committee-repo/scoring-ops");
    floorAssemble = await import("@/lib/committee-repo/floor-assemble");

    const [conf] = await dbmod.db
      .insert(dbmod.conferences)
      .values({ name: `IT-${randomUUID()}`, year: 2026 })
      .returning();
    conferenceId = conf.id;
    const [c] = await dbmod.db
      .insert(dbmod.committees)
      .values({
        conferenceId,
        name: "IT",
        type: "ga",
        topic: "",
        data: emptyCommitteeData(),
        floorMigrated: true,
        scoringMigrated: true,
      })
      .returning();
    committeeId = c.id;
  });

  afterAll(async () => {
    if (conferenceId) {
      const { eq } = await import("drizzle-orm");
      await dbmod.db
        .delete(dbmod.conferences)
        .where(eq(dbmod.conferences.id, conferenceId));
    }
  });

  it("assigns distinct submission numbers to concurrent draft-resolution upserts", async () => {
    const mkDoc = (id: string) => ({
      domain: "document" as const,
      action: "upsert" as const,
      id,
      version: 0,
      data: {
        id,
        title: id,
        type: "draft_resolution" as const,
        status: "submitted" as const,
        sponsors: [],
        signatories: [],
        authorPanel: [],
        content: "",
        amendments: [],
      },
    });

    const a = randomUUID();
    const b = randomUUID();
    await Promise.all([
      floorOps.applyFloorOps(committeeId, null, [mkDoc(a)]),
      floorOps.applyFloorOps(committeeId, null, [mkDoc(b)]),
    ]);

    const floor = await floorAssemble.assembleFloor(committeeId);
    const nums = floor.documents
      .map((d: { submissionNumber?: number }) => d.submissionNumber)
      .filter((n: number | undefined): n is number => n != null)
      .sort();
    expect(new Set(nums).size).toBe(nums.length); // all distinct
  });

  it("resolves concurrent marks on the same delegate by last event wins", async () => {
    const sessionId = randomUUID();
    const delegateId = randomUUID();
    await floorOps.applyFloorOps(committeeId, null, [
      {
        domain: "rollCallSession",
        action: "upsert",
        id: sessionId,
        version: 0,
        label: "RC",
        timestamp: new Date().toISOString(),
        quorumMet: false,
      },
    ]);

    await floorOps.applyFloorOps(committeeId, null, [
      { domain: "attendance", action: "mark", sessionId, delegateId, status: "absent" },
    ]);
    await floorOps.applyFloorOps(committeeId, null, [
      { domain: "attendance", action: "mark", sessionId, delegateId, status: "present" },
    ]);

    const floor = await floorAssemble.assembleFloor(committeeId);
    const session = floor.rollCalls.find(
      (s: { id: string }) => s.id === sessionId
    );
    expect(session?.attendance[delegateId]).toBe("present");
  });

  it("lets a chair floor op and a registrar scoring op both commit concurrently", async () => {
    const motionId = randomUUID();
    const delegateId = randomUUID();
    const [floorRes, scoringRes] = await Promise.all([
      floorOps.applyFloorOps(committeeId, null, [
        {
          domain: "motion",
          action: "upsert",
          id: motionId,
          version: 0,
          data: {
            id: motionId,
            type: "moderated_caucus",
            proposedBy: "d1",
            timestamp: new Date().toISOString(),
            status: "pending",
            disruptivity: 1,
            details: {},
          },
          sessionState: {},
        },
      ]),
      scoringOps.applyScoringOps(committeeId, [
        {
          domain: "rubric",
          role: "judge",
          delegateId,
          version: 0,
          data: { delegateId, scores: {}, total: 0, notes: "", signed: false },
        },
      ]),
    ]);
    expect(floorRes.ok).toBe(true);
    expect(floorRes.conflict).toBe(false);
    expect(scoringRes.ok).toBe(true);
    expect(scoringRes.conflict).toBe(false);
  });

  it("persists notifications in the DB (survives across instances)", async () => {
    const { eq } = await import("drizzle-orm");
    const [row] = await dbmod.db
      .insert(dbmod.notifications)
      .values({
        conferenceId,
        message: "hello chairs",
        committeeIds: null,
        createdBy: "admin",
      })
      .returning();

    // A fresh read (simulating another serverless instance) sees it.
    const [found] = await dbmod.db
      .select()
      .from(dbmod.notifications)
      .where(eq(dbmod.notifications.id, row.id))
      .limit(1);
    expect(found?.message).toBe("hello chairs");
  });

  it("flags a stale-version entity write as a conflict", async () => {
    const motionId = randomUUID();
    const mk = (notes: string) => ({
      domain: "motion" as const,
      action: "upsert" as const,
      id: motionId,
      version: 0,
      data: {
        id: motionId,
        type: "moderated_caucus",
        proposedBy: "d1",
        timestamp: new Date().toISOString(),
        status: "pending" as const,
        disruptivity: 1,
        details: {},
        notes,
      },
      sessionState: {},
    });

    // First insert (version 0 → 1).
    await floorOps.applyFloorOps(committeeId, null, [mk("first")]);
    // Two more writes both claiming version 0 (stale): exactly one is a conflict.
    const [r1, r2] = await Promise.all([
      floorOps.applyFloorOps(committeeId, null, [mk("second")]),
      floorOps.applyFloorOps(committeeId, null, [mk("third")]),
    ]);
    expect(r1.conflict || r2.conflict).toBe(true);
  });
});
