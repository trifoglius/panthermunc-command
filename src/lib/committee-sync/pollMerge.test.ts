import { describe, expect, it } from "vitest";
import type { CommitteeData } from "@/db/schema";
import { classifyServerUpdate } from "./pollMerge";
import { mergeServerIntoLocal } from "./conflict";
import type { Committee } from "@/lib/types";

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

describe("classifyServerUpdate", () => {
  it("replaces when there are no local edits", () => {
    const base = emptyData();
    const server = emptyData();
    server.discrepancyThreshold = 20;
    expect(classifyServerUpdate(base, server, new Set())).toBe("replace");
  });

  it("merges when server changed a DIFFERENT key than the dirty one", () => {
    const base = emptyData();
    const server = emptyData();
    server.requirePositionPapers = true; // server changed this
    const dirty = new Set<keyof CommitteeData>(["discrepancyThreshold"]);
    expect(classifyServerUpdate(base, server, dirty)).toBe("merge");
  });

  it("conflicts when server changed the SAME key we are editing (no silent LWW)", () => {
    const base = emptyData();
    const server = emptyData();
    server.discrepancyThreshold = 20; // server changed the same key
    const dirty = new Set<keyof CommitteeData>(["discrepancyThreshold"]);
    expect(classifyServerUpdate(base, server, dirty)).toBe("conflict");
  });
});

describe("mergeServerIntoLocal", () => {
  it("keeps local values for dirty keys and adopts server for the rest", () => {
    const local = {
      id: "c1",
      name: "C",
      type: "ga",
      topic: "",
      createdAt: "",
      ...emptyData(),
      discrepancyThreshold: 99, // locally edited (dirty)
      requirePositionPapers: false,
    } as unknown as Committee;

    const server = emptyData();
    server.discrepancyThreshold = 20; // should be ignored (dirty locally)
    server.requirePositionPapers = true; // should be adopted (not dirty)

    const merged = mergeServerIntoLocal(
      local,
      server,
      new Set<keyof CommitteeData>(["discrepancyThreshold"])
    );
    expect(merged.discrepancyThreshold).toBe(99);
    expect(merged.requirePositionPapers).toBe(true);
  });
});
