import type {
  Delegate,
  Document,
  Motion,
  MotionQueueSnapshot,
  MotionSessionState,
  Point,
  RollCallStatus,
  SpeakingEvent,
} from "@/lib/types";

/**
 * Wire contract for normalized floor writes. The client computes a minimal set
 * of entity operations by diffing local state against its last-synced base, and
 * the server applies them transactionally with per-entity optimistic version
 * checks. This is what replaces whole-array blob writes for floor domains, so
 * concurrent chairs editing different entities never clobber each other.
 *
 * Versioned ops (delegate/motion/point/rollCallSession) carry the entity
 * version the client last saw; append-only ops (attendance/speaking/queue
 * snapshots) carry none because every write is an insert.
 */
export type FloorOp =
  | { domain: "delegate"; action: "upsert"; id: string; version: number; data: Delegate }
  | { domain: "delegate"; action: "delete"; id: string; version: number }
  | {
      domain: "motion";
      action: "upsert";
      id: string;
      version: number;
      data: Motion;
      sessionState: MotionSessionState;
    }
  | { domain: "motion"; action: "delete"; id: string; version: number }
  | { domain: "point"; action: "upsert"; id: string; version: number; data: Point }
  | { domain: "document"; action: "upsert"; id: string; version: number; data: Document }
  | { domain: "document"; action: "delete"; id: string; version: number }
  | {
      domain: "rollCallSession";
      action: "upsert";
      id: string;
      version: number;
      label: string;
      timestamp: string;
      quorumMet: boolean;
    }
  | {
      domain: "attendance";
      action: "mark";
      sessionId: string;
      delegateId: string;
      status: RollCallStatus;
    }
  | { domain: "speakingEvent"; action: "append"; id: string; data: SpeakingEvent }
  | {
      domain: "motionQueueSnapshot";
      action: "append";
      id: string;
      data: MotionQueueSnapshot;
    };

/** Per-entity versions the client tracks to drive optimistic concurrency. */
export interface FloorEntityVersions {
  delegates: Record<string, number>;
  motions: Record<string, number>;
  points: Record<string, number>;
  rollCallSessions: Record<string, number>;
  documents: Record<string, number>;
}

export function emptyFloorEntityVersions(): FloorEntityVersions {
  return {
    delegates: {},
    motions: {},
    points: {},
    rollCallSessions: {},
    documents: {},
  };
}

/** Response from the floor-ops endpoint. */
export interface FloorOpsResult {
  /** New committee row version (bumped so pollers detect the change). */
  committeeVersion: number;
  /** Updated per-entity versions after applying the ops. */
  entityVersions: FloorEntityVersions;
  /** True when any op hit a stale entity version and the client must refresh. */
  conflict: boolean;
}
