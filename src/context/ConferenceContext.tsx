"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/context/AuthContext";
import { computeRubricTotal, createEmptyRubricScore } from "@/lib/scoring";
import {
  committeeToData,
  rowToCommittee,
  emptyCommitteeStub,
  COMMITTEE_DATA_KEYS,
  type DbCommitteeRow,
} from "@/lib/committee-mappers";
import { COMMITTEE_POLL_MS } from "@/lib/sync-constants";
import { usePolling } from "@/hooks/usePolling";
import type {
  Committee,
  CommitteeType,
  Conference,
  Delegate,
  Document,
  Motion,
  MotionQueueSnapshot,
  Point,
  PositionPaperStatus,
  PaperVoteRecord,
  RollCallSession,
  RollCallStatus,
  RubricScore,
  ScorerRole,
  SpeakingEvent,
} from "@/lib/types";
import type { CommitteeData } from "@/db/schema";
import { isFormalSpeakingMotion, getMotionTypeId, isAffirmative } from "@/lib/motion-timers";

// ---------------------------------------------------------------------------
// Context interface
// ---------------------------------------------------------------------------

interface ConferenceContextValue {
  conference: Conference | null;
  activeCommittee: Committee | null;
  loading: boolean;
  conferenceUnavailable: boolean;
  syncError: string | null;
  clearSyncError: () => void;
  initConference: (name: string, year: number) => Promise<void>;
  updateConference: (updates: { name?: string; year?: number }) => Promise<void>;
  removeCommittee: (id: string) => Promise<void>;
  deleteConference: () => Promise<void>;
  createCommittee: (
    name: string,
    type: CommitteeType,
    topic: string,
    withDefaults?: boolean
  ) => Promise<string>;
  selectCommittee: (id: string | null) => Promise<void>;
  loadAllCommitteeData: () => Promise<void>;
  updateCommittee: (committee: Committee) => void;
  addDelegate: (
    country: string,
    delegateName: string,
    ppStatus?: PositionPaperStatus
  ) => void;
  updateDelegate: (delegate: Delegate) => void;
  removeDelegate: (id: string) => void;
  startRollCall: (label: string) => string;
  updateRollCallStatus: (
    sessionId: string,
    delegateId: string,
    status: RollCallStatus
  ) => void;
  addMotion: (motion: Omit<Motion, "id" | "timestamp">) => void;
  updateMotion: (motion: Motion) => void;
  setMotionSpeakerQueue: (motionId: string, queue: string[]) => void;
  setMotionVotingSpeakers: (
    motionId: string,
    speakersFor: string[],
    speakersAgainst: string[]
  ) => void;
  setMotionPaperVotes: (motionId: string, paperVotes: PaperVoteRecord[]) => void;
  archiveMotionQueue: (passedMotionId: string) => void;
  addDocument: (doc: Omit<Document, "id" | "amendments">) => void;
  updateDocument: (doc: Document) => void;
  promoteToDraftResolution: (workingPaperId: string) => void;
  addSpeakingEvent: (event: Omit<SpeakingEvent, "id" | "timestamp">) => void;
  addPoint: (point: Omit<Point, "id" | "timestamp" | "resolved">) => void;
  resolvePoint: (id: string) => void;
  updateRubricScore: (
    role: ScorerRole,
    delegateId: string,
    scores: Record<string, number>,
    notes?: string
  ) => void;
  signScores: (role: ScorerRole) => void;
  updatePositionPaperScore: (
    delegateId: string,
    score: number,
    notes?: string
  ) => void;
  setVcRecipient: (delegateId: string | undefined) => void;
}

const ConferenceContext = createContext<ConferenceContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ConferenceProvider({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth();

  const [conference, setConference] = useState<Conference | null>(null);
  const [activeCommitteeId, setActiveCommitteeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [conferenceUnavailable, setConferenceUnavailable] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Keep a stable ref to latest conference for debounced callbacks
  const conferenceRef = useRef<Conference | null>(null);
  useEffect(() => {
    conferenceRef.current = conference;
  }, [conference]);

  // Per-committee version tracking (incremented by server on each write)
  const versions = useRef<Map<string, number>>(new Map());

  // Dirty-key tracking: which CommitteeData keys changed since last save
  const dirtyKeys = useRef<Map<string, Set<keyof CommitteeData>>>(new Map());

  // Debounce timers for persisting committee data
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ---------------------------------------------------------------------------
  // Load committee full data
  // ---------------------------------------------------------------------------

  const loadCommitteeData = useCallback(async (id: string, ifVersion?: number) => {
    try {
      const url =
        ifVersion !== undefined
          ? `/api/committees/${id}?ifVersion=${ifVersion}`
          : `/api/committees/${id}`;
      const r = await fetch(url);
      if (r.status === 304) return; // version unchanged — no update needed
      if (!r.ok) return;
      const row: DbCommitteeRow = await r.json();
      versions.current.set(id, row.version);
      const committee = rowToCommittee(row);
      setConference((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          committees: prev.committees.map((c) => (c.id === id ? committee : c)),
        };
        conferenceRef.current = updated;
        return updated;
      });
    } catch {
      // non-fatal
    }
  }, []);

  // Versions-first load: one lightweight request, then full fetch only for changed committees.
  const loadAllCommitteeData = useCallback(async () => {
    const conf = conferenceRef.current;
    if (!conf || conf.committees.length === 0) return;
    try {
      const r = await fetch("/api/conference/versions");
      if (!r.ok) {
        await Promise.all(conf.committees.map((c) => loadCommitteeData(c.id)));
        return;
      }
      const { committees: serverVersions } = (await r.json()) as {
        committees: Array<{ id: string; version: number }>;
      };
      const changed = serverVersions.filter(
        (sv) => versions.current.get(sv.id) !== sv.version
      );
      if (changed.length > 0) {
        await Promise.all(changed.map((sv) => loadCommitteeData(sv.id)));
      }
    } catch {
      // non-fatal
    }
  }, [loadCommitteeData]);

  // ---------------------------------------------------------------------------
  // Load conference on mount (after auth resolves)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const r = await fetch("/api/conference");
        if (!r.ok) {
          if (r.status === 404) {
            setConferenceUnavailable(true);
          }
          setLoading(false);
          return;
        }
        setConferenceUnavailable(false);
        const data = await r.json();

        const conf: Conference = {
          id: data.id,
          name: data.name,
          year: data.year,
          committees: data.committees.map(emptyCommitteeStub),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        setConference(conf);
        conferenceRef.current = conf;
        data.committees.forEach((c: { id: string; version: number }) =>
          versions.current.set(c.id, c.version)
        );

        // Auto-select and load the appropriate committee
        const targetId = user.committeeId ?? data.committees[0]?.id ?? null;
        if (targetId) {
          setActiveCommitteeId(targetId);
          await loadCommitteeData(targetId);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, loadCommitteeData]);

  // ---------------------------------------------------------------------------
  // Poll active committee data for all users assigned to a committee.
  // Uses ifVersion so most polls are cheap 304 responses.
  // ---------------------------------------------------------------------------

  const pollActiveCommittee = useCallback(() => {
    if (!activeCommitteeId) return;
    const knownVersion = versions.current.get(activeCommitteeId);
    void loadCommitteeData(activeCommitteeId, knownVersion);
  }, [activeCommitteeId, loadCommitteeData]);

  usePolling(
    pollActiveCommittee,
    COMMITTEE_POLL_MS,
    !loading && !!activeCommitteeId && !!user
  );

  // ---------------------------------------------------------------------------
  // Active committee memo
  // ---------------------------------------------------------------------------

  const activeCommittee = useMemo(
    () =>
      conference?.committees.find((c) => c.id === activeCommitteeId) ?? null,
    [conference, activeCommitteeId]
  );

  // ---------------------------------------------------------------------------
  // Persist committee data to API (debounced, 1s)
  // Uses dirty-key tracking to send only changed CommitteeData fields.
  // ---------------------------------------------------------------------------

  const syncCommittee = useCallback(
    (committeeId: string) => {
      const conf = conferenceRef.current;
      const committee = conf?.committees.find((c) => c.id === committeeId);
      if (!committee) return;

      // Snapshot and clear dirty keys before the async PATCH
      const dirty = dirtyKeys.current.get(committeeId) ?? new Set<keyof CommitteeData>();
      dirtyKeys.current.set(committeeId, new Set());

      const fullData = committeeToData(committee);
      const partialData: Partial<CommitteeData> = {};
      for (const k of dirty) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (partialData as any)[k] = (fullData as any)[k];
      }
      // Fallback: send full data if dirty tracking is empty (e.g., updateCommittee)
      const dataPayload = dirty.size > 0 ? partialData : fullData;

      const version = versions.current.get(committeeId) ?? 0;
      fetch(`/api/committees/${committeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, data: dataPayload }),
      })
        .then(async (r) => {
          if (r.ok) {
            const row = await r.json();
            versions.current.set(committeeId, row.version);
          } else if (r.status === 409) {
            const body = await r.json();
            versions.current.set(
              committeeId,
              body.latest?.version ?? versions.current.get(committeeId) ?? 0
            );
            await loadCommitteeData(committeeId);
            setSyncError(
              "Another change was detected — your view has been refreshed."
            );
          }
        })
        .catch(() => {
          setSyncError("Failed to save — check your connection.");
        });
    },
    [loadCommitteeData]
  );

  const scheduleSave = useCallback(
    (committeeId: string) => {
      const existing = saveTimers.current.get(committeeId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        saveTimers.current.delete(committeeId);
        syncCommittee(committeeId);
      }, 1000);
      saveTimers.current.set(committeeId, timer);
    },
    [syncCommittee]
  );

  // ---------------------------------------------------------------------------
  // Core patch helper (applies locally + tracks dirty keys + schedules save)
  // ---------------------------------------------------------------------------

  const patchCommittee = useCallback(
    (committeeId: string, updater: (c: Committee) => Committee) => {
      setConference((prev) => {
        if (!prev) return prev;
        const oldC = prev.committees.find((c) => c.id === committeeId);
        const newC = oldC ? updater(oldC) : null;
        if (!newC || !oldC) return prev;

        // Detect which CommitteeData keys changed (shallow reference equality)
        const existing =
          dirtyKeys.current.get(committeeId) ?? new Set<keyof CommitteeData>();
        for (const k of COMMITTEE_DATA_KEYS) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((oldC as any)[k] !== (newC as any)[k]) {
            existing.add(k);
          }
        }
        dirtyKeys.current.set(committeeId, existing);

        const updated = {
          ...prev,
          committees: prev.committees.map((c) =>
            c.id === committeeId ? newC : c
          ),
        };
        conferenceRef.current = updated;
        return updated;
      });
      scheduleSave(committeeId);
    },
    [scheduleSave]
  );

  const requireCommittee = () => {
    if (!activeCommitteeId) throw new Error("No active committee");
    return activeCommitteeId;
  };

  // ---------------------------------------------------------------------------
  // Conference-level mutations
  // ---------------------------------------------------------------------------

  const initConference = async (name: string, year: number) => {
    const r = await fetch("/api/conference", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, year }),
    });

    if (!r.ok) {
      setSyncError("Failed to initialize conference. Please try again.");
      return;
    }

    const data = await r.json();
    const next: Conference = {
      id: data.id,
      name: data.name,
      year: data.year,
      committees: (data.committees ?? []).map(emptyCommitteeStub),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    setConference(next);
    conferenceRef.current = next;
  };

  const updateConference = async (updates: { name?: string; year?: number }) => {
    await fetch("/api/conference", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setConference((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const createCommittee = async (
    name: string,
    type: CommitteeType,
    topic: string,
    withDefaults = true
  ): Promise<string> => {
    const r = await fetch("/api/committees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, topic, withDefaults }),
    });
    if (!r.ok) throw new Error("Failed to create committee");
    const row: DbCommitteeRow = await r.json();
    versions.current.set(row.id, row.version);
    const committee = rowToCommittee(row);
    setConference((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, committees: [...prev.committees, committee] };
      conferenceRef.current = updated;
      return updated;
    });
    setActiveCommitteeId(row.id);
    return row.id;
  };

  const selectCommittee = async (id: string | null) => {
    setActiveCommitteeId(id);
    if (id) {
      await loadCommitteeData(id);
    }
  };

  const updateCommittee = (committee: Committee) => {
    patchCommittee(committee.id, () => committee);
  };

  const removeCommittee = async (id: string) => {
    const remaining =
      conferenceRef.current?.committees.filter((c) => c.id !== id) ?? [];
    if (activeCommitteeId === id) {
      const next = remaining[0]?.id ?? null;
      setActiveCommitteeId(next);
      if (next) await loadCommitteeData(next);
    }
    await fetch(`/api/committees/${id}`, { method: "DELETE" });
    setConference((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        committees: prev.committees.filter((c) => c.id !== id),
      };
      conferenceRef.current = updated;
      return updated;
    });
  };

  const deleteConference = async () => {
    await fetch("/api/conference", { method: "DELETE" });
    // Deleting a conference cascades to users; clear the session immediately
    await fetch("/api/auth/logout", { method: "POST" });
    setConference(null);
    setActiveCommitteeId(null);
    conferenceRef.current = null;
    window.location.href = "/";
  };

  // ---------------------------------------------------------------------------
  // Committee-data mutations (all go through patchCommittee)
  // ---------------------------------------------------------------------------

  const addDelegate = (
    country: string,
    delegateName: string,
    ppStatus: PositionPaperStatus = "none"
  ) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => {
      const d: Delegate = {
        id: uuidv4(),
        country,
        delegateName,
        positionPaperStatus: ppStatus,
      };
      return {
        ...c,
        delegates: [...c.delegates, d],
        judgeScores: [...c.judgeScores, createEmptyRubricScore(d.id, c.type)],
        daisScores: [...c.daisScores, createEmptyRubricScore(d.id, c.type)],
      };
    });
  };

  const updateDelegate = (delegate: Delegate) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      delegates: c.delegates.map((d) => (d.id === delegate.id ? delegate : d)),
    }));
  };

  const removeDelegate = (id: string) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      delegates: c.delegates.filter((d) => d.id !== id),
      judgeScores: c.judgeScores.filter((s) => s.delegateId !== id),
      daisScores: c.daisScores.filter((s) => s.delegateId !== id),
    }));
  };

  const startRollCall = (label: string) => {
    const cid = requireCommittee();
    const sessionId = uuidv4();
    patchCommittee(cid, (c) => {
      const attendance: Record<string, RollCallStatus> = {};
      c.delegates.forEach((d) => {
        attendance[d.id] = "absent";
      });
      const session: RollCallSession = {
        id: sessionId,
        label,
        timestamp: new Date().toISOString(),
        attendance,
        quorumMet: false,
      };
      return { ...c, rollCalls: [session, ...c.rollCalls] };
    });
    return sessionId;
  };

  const updateRollCallStatus = (
    sessionId: string,
    delegateId: string,
    status: RollCallStatus
  ) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      rollCalls: c.rollCalls.map((rc) => {
        if (rc.id !== sessionId) return rc;
        const attendance = { ...rc.attendance, [delegateId]: status };
        const present = Object.values(attendance).filter(
          (s) => s === "present" || s === "present_voting"
        ).length;
        return { ...rc, attendance, quorumMet: present > c.delegates.length / 2 };
      }),
    }));
  };

  const addMotion = (motion: Omit<Motion, "id" | "timestamp">) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      motions: [
        { ...motion, id: uuidv4(), timestamp: new Date().toISOString() },
        ...c.motions,
      ],
    }));
  };

  const updateMotion = (motion: Motion) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      motions: c.motions.map((m) => (m.id === motion.id ? motion : m)),
    }));
  };

  const setMotionSpeakerQueue = (motionId: string, queue: string[]) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      motionSessionState: {
        ...(c.motionSessionState ?? {}),
        [motionId]: {
          ...(c.motionSessionState?.[motionId] ?? {}),
          speakerQueue: queue,
        },
      },
    }));
  };

  const setMotionVotingSpeakers = (
    motionId: string,
    speakersFor: string[],
    speakersAgainst: string[]
  ) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      motionSessionState: {
        ...(c.motionSessionState ?? {}),
        [motionId]: {
          ...(c.motionSessionState?.[motionId] ?? {}),
          speakersFor,
          speakersAgainst,
        },
      },
    }));
  };

  const setMotionPaperVotes = (
    motionId: string,
    paperVotes: PaperVoteRecord[]
  ) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      motionSessionState: {
        ...(c.motionSessionState ?? {}),
        [motionId]: {
          ...(c.motionSessionState?.[motionId] ?? {}),
          paperVotes,
        },
      },
    }));
  };

  const archiveMotionQueue = (passedMotionId: string) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => {
      const passedMotion =
        c.motions.find((m) => m.id === passedMotionId) ?? null;
      const sessionState = c.motionSessionState ?? {};
      const motionState = sessionState[passedMotionId];
      const isVotingForAgainst =
        passedMotion &&
        getMotionTypeId(passedMotion) === "enter_voting" &&
        isAffirmative(passedMotion.details.two_for_two_against);
      const speakerQueue =
        passedMotion && isFormalSpeakingMotion(passedMotion) && !isVotingForAgainst
          ? motionState?.speakerQueue
          : undefined;
      const votingSpeakers =
        passedMotion && isVotingForAgainst
          ? {
              for: motionState?.speakersFor ?? [],
              against: motionState?.speakersAgainst ?? [],
            }
          : undefined;

      const snapshot: MotionQueueSnapshot = {
        id: uuidv4(),
        label: passedMotion
          ? `After: ${passedMotion.type}`
          : `Queue ${(c.motionQueueHistory?.length ?? 0) + 1}`,
        savedAt: new Date().toISOString(),
        passedMotion,
        motions: [...c.motions],
        speakerQueue:
          speakerQueue && speakerQueue.length > 0 ? speakerQueue : undefined,
        votingSpeakers:
          votingSpeakers &&
          (votingSpeakers.for.length > 0 || votingSpeakers.against.length > 0)
            ? votingSpeakers
            : undefined,
      };

      const archivedIds = new Set(c.motions.map((m) => m.id));
      const nextSessionState = { ...sessionState };
      archivedIds.forEach((id) => delete nextSessionState[id]);

      return {
        ...c,
        motions: [],
        motionQueueHistory: [snapshot, ...(c.motionQueueHistory ?? [])],
        motionSessionState: nextSessionState,
      };
    });
  };

  const addDocument = (doc: Omit<Document, "id" | "amendments">) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      documents: [{ ...doc, id: uuidv4(), amendments: [] }, ...c.documents],
    }));
  };

  const updateDocument = (doc: Document) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      documents: c.documents.map((d) => (d.id === doc.id ? doc : d)),
    }));
  };

  const promoteToDraftResolution = (workingPaperId: string) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => {
      const wp = c.documents.find((d) => d.id === workingPaperId);
      if (!wp || wp.type !== "working_paper") return c;
      return {
        ...c,
        documents: c.documents.map((d) =>
          d.id === workingPaperId
            ? {
                ...d,
                type: "draft_resolution" as const,
                status: "submitted" as const,
                submittedAt: new Date().toISOString(),
              }
            : d
        ),
      };
    });
  };

  const addSpeakingEvent = (event: Omit<SpeakingEvent, "id" | "timestamp">) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      speakingEvents: [
        { ...event, id: uuidv4(), timestamp: new Date().toISOString() },
        ...c.speakingEvents,
      ],
    }));
  };

  const addPoint = (point: Omit<Point, "id" | "timestamp" | "resolved">) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      points: [
        {
          ...point,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          resolved: false,
        },
        ...c.points,
      ],
    }));
  };

  const resolvePoint = (id: string) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      points: c.points.map((p) => (p.id === id ? { ...p, resolved: true } : p)),
    }));
  };

  const updateRubricScore = (
    role: ScorerRole,
    delegateId: string,
    scores: Record<string, number>,
    notes?: string
  ) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => {
      const key = role === "judge" ? "judgeScores" : "daisScores";
      const existing = c[key].find((s) => s.delegateId === delegateId);
      const total = computeRubricTotal(scores, c.type);
      const updated: RubricScore = existing
        ? { ...existing, scores, total, notes: notes ?? existing.notes }
        : { delegateId, scores, total, notes: notes ?? "", signed: false };
      const list = existing
        ? c[key].map((s) => (s.delegateId === delegateId ? updated : s))
        : [...c[key], updated];
      return { ...c, [key]: list };
    });
  };

  const signScores = (role: ScorerRole) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => {
      const key = role === "judge" ? "judgeScores" : "daisScores";
      return {
        ...c,
        [key]: c[key].map((s) => ({
          ...s,
          signed: true,
          signedAt: new Date().toISOString(),
        })),
      };
    });
  };

  const updatePositionPaperScore = (
    delegateId: string,
    score: number,
    notes?: string
  ) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => {
      const existing = c.positionPaperScores.find(
        (s) => s.delegateId === delegateId
      );
      const entry = { delegateId, score, notes: notes ?? "" };
      return {
        ...c,
        positionPaperScores: existing
          ? c.positionPaperScores.map((s) =>
              s.delegateId === delegateId ? entry : s
            )
          : [...c.positionPaperScores, entry],
      };
    });
  };

  const setVcRecipient = (delegateId: string | undefined) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({ ...c, vcRecipientId: delegateId }));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ConferenceContext.Provider
      value={{
        conference,
        activeCommittee,
        loading: user ? loading : false,
        conferenceUnavailable,
        syncError,
        clearSyncError: () => setSyncError(null),
        initConference,
        updateConference,
        removeCommittee,
        deleteConference,
        createCommittee,
        selectCommittee,
        loadAllCommitteeData,
        updateCommittee,
        addDelegate,
        updateDelegate,
        removeDelegate,
        startRollCall,
        updateRollCallStatus,
        addMotion,
        updateMotion,
        setMotionSpeakerQueue,
        setMotionVotingSpeakers,
        setMotionPaperVotes,
        archiveMotionQueue,
        addDocument,
        updateDocument,
        promoteToDraftResolution,
        addSpeakingEvent,
        addPoint,
        resolvePoint,
        updateRubricScore,
        signScores,
        updatePositionPaperScore,
        setVcRecipient,
      }}
    >
      {children}
    </ConferenceContext.Provider>
  );
}

export function useConference() {
  const ctx = useContext(ConferenceContext);
  if (!ctx) throw new Error("useConference must be used within provider");
  return ctx;
}
