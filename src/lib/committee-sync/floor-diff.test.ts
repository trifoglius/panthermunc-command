import { describe, expect, it } from "vitest";
import type { CommitteeData } from "@/db/schema";
import type { Delegate, Motion, RollCallSession } from "@/lib/types";
import { diffFloor } from "./floor-diff";
import { emptyFloorEntityVersions } from "./floor-ops-types";

function emptyData(): CommitteeData {
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

function motion(id: string, notes = ""): Motion {
  return {
    id,
    type: "moderated_caucus",
    proposedBy: "d1",
    timestamp: "2026-01-01T00:00:00.000Z",
    status: "pending",
    disruptivity: 1,
    details: {},
    notes,
  };
}

function delegate(id: string, country: string): Delegate {
  return { id, country, delegateName: "", positionPaperStatus: "none" };
}

function session(
  id: string,
  attendance: RollCallSession["attendance"]
): RollCallSession {
  return {
    id,
    label: "RC",
    timestamp: "2026-01-01T00:00:00.000Z",
    attendance,
    quorumMet: false,
  };
}

describe("diffFloor", () => {
  it("emits a single versioned upsert for one edited motion, leaving others alone", () => {
    const base = emptyData();
    base.motions = [motion("m1"), motion("m2")];
    const local = emptyData();
    local.motions = [motion("m1", "edited"), motion("m2")];

    const versions = emptyFloorEntityVersions();
    versions.motions = { m1: 3, m2: 5 };

    const ops = diffFloor(base, local, versions);
    const motionOps = ops.filter((o) => o.domain === "motion");
    expect(motionOps).toHaveLength(1);
    expect(motionOps[0]).toMatchObject({ id: "m1", action: "upsert", version: 3 });
  });

  it("treats concurrent edits to different delegates as disjoint upserts", () => {
    const base = emptyData();
    base.delegates = [delegate("d1", "USA")];
    const local = emptyData();
    local.delegates = [delegate("d1", "USA"), delegate("d2", "FRA")];

    const ops = diffFloor(base, local, emptyFloorEntityVersions());
    const delegateOps = ops.filter((o) => o.domain === "delegate");
    expect(delegateOps).toHaveLength(1);
    expect(delegateOps[0]).toMatchObject({ id: "d2", action: "upsert", version: 0 });
  });

  it("emits an append attendance mark op when a delegate's status changes", () => {
    const base = emptyData();
    base.rollCalls = [session("s1", { d1: "absent" })];
    const local = emptyData();
    local.rollCalls = [session("s1", { d1: "present" })];

    const ops = diffFloor(base, local, emptyFloorEntityVersions());
    const marks = ops.filter((o) => o.domain === "attendance");
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({
      sessionId: "s1",
      delegateId: "d1",
      status: "present",
      action: "mark",
    });
  });

  it("emits a document upsert for a newly added document", () => {
    const base = emptyData();
    const local = emptyData();
    local.documents = [
      {
        id: "doc1",
        title: "WP",
        type: "working_paper",
        status: "draft",
        sponsors: [],
        signatories: [],
        authorPanel: [],
        content: "",
        amendments: [],
      },
    ];

    const ops = diffFloor(base, local, emptyFloorEntityVersions());
    const docOps = ops.filter((o) => o.domain === "document");
    expect(docOps).toHaveLength(1);
    expect(docOps[0]).toMatchObject({ id: "doc1", action: "upsert", version: 0 });
  });

  it("returns no ops when base and local are identical", () => {
    const base = emptyData();
    base.motions = [motion("m1")];
    const local = emptyData();
    local.motions = [motion("m1")];
    expect(diffFloor(base, local, emptyFloorEntityVersions())).toHaveLength(0);
  });
});
