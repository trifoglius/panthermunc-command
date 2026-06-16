"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_DELEGATES_GA } from "@/lib/constants";
import { computeRubricTotal, createEmptyRubricScore } from "@/lib/scoring";
import {
  exportConferenceJson,
  importConferenceJson,
  loadConference,
  saveConference,
  clearConference as clearStoredConference,
} from "@/lib/storage";
import { hashPassword, verifyPassword } from "@/lib/password";
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
  RollCallSession,
  RollCallStatus,
  RubricScore,
  ScorerRole,
  SpeakingEvent,
} from "@/lib/types";
import { isFormalSpeakingMotion } from "@/lib/motion-timers";

interface ConferenceContextValue {
  conference: Conference | null;
  activeCommittee: Committee | null;
  loading: boolean;
  initConference: (name: string, year: number, password: string) => Promise<void>;
  updateConference: (updates: { name?: string; year?: number }) => void;
  removeCommittee: (id: string) => void;
  deleteConference: () => void;
  verifyManagementPassword: (password: string) => Promise<boolean>;
  createCommittee: (
    name: string,
    type: CommitteeType,
    topic: string,
    withDefaults?: boolean
  ) => string;
  selectCommittee: (id: string | null) => void;
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
  archiveMotionQueue: (passedMotionId: string) => void;
  addDocument: (doc: Omit<Document, "id" | "amendments">) => void;
  updateDocument: (doc: Document) => void;
  promoteToDraftResolution: (workingPaperId: string) => void;
  addSpeakingEvent: (
    event: Omit<SpeakingEvent, "id" | "timestamp">
  ) => void;
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
  exportJson: () => void;
  importJson: (file: File) => Promise<void>;
}

const ConferenceContext = createContext<ConferenceContextValue | null>(null);

function createDefaultConference(
  name: string,
  year: number,
  managementPasswordHash?: string
): Conference {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    year,
    managementPasswordHash,
    committees: [],
    createdAt: now,
    updatedAt: now,
  };
}

function createDefaultCommittee(
  name: string,
  type: CommitteeType,
  topic: string,
  withDefaults: boolean
): Committee {
  const delegates: Delegate[] = withDefaults
    ? DEFAULT_DELEGATES_GA.map((country) => ({
        id: uuidv4(),
        country,
        delegateName: "",
        positionPaperStatus: "none" as const,
      }))
    : [];

  const judgeScores = delegates.map((d) => createEmptyRubricScore(d.id, type));
  const daisScores = delegates.map((d) => createEmptyRubricScore(d.id, type));

  return {
    id: uuidv4(),
    name,
    type,
    topic,
    delegates,
    rollCalls: [],
    motions: [],
    motionQueueHistory: [],
    motionSessionState: {},
    documents: [],
    speakingEvents: [],
    points: [],
    judgeScores,
    daisScores,
    positionPaperScores: [],
    discrepancyThreshold: 10,
    requirePositionPapers: type === "ga",
    createdAt: new Date().toISOString(),
  };
}

export function ConferenceProvider({ children }: { children: ReactNode }) {
  const [conference, setConference] = useState<Conference | null>(null);
  const [activeCommitteeId, setActiveCommitteeId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = loadConference();
    if (saved) {
      setConference(saved);
      if (saved.committees.length > 0) {
        setActiveCommitteeId(saved.committees[0].id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (conference) saveConference(conference);
  }, [conference]);

  const activeCommittee = useMemo(
    () =>
      conference?.committees.find((c) => c.id === activeCommitteeId) ?? null,
    [conference, activeCommitteeId]
  );

  const patchCommittee = useCallback(
    (committeeId: string, updater: (c: Committee) => Committee) => {
      setConference((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          committees: prev.committees.map((c) =>
            c.id === committeeId ? updater(c) : c
          ),
        };
      });
    },
    []
  );

  const requireCommittee = () => {
    if (!activeCommitteeId) throw new Error("No active committee");
    return activeCommitteeId;
  };

  const initConference = async (name: string, year: number, password: string) => {
    const managementPasswordHash = await hashPassword(password);
    const conf = createDefaultConference(name, year, managementPasswordHash);
    setConference(conf);
    setActiveCommitteeId(null);
  };

  const updateConference = (updates: { name?: string; year?: number }) => {
    setConference((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const removeCommittee = (id: string) => {
    const remaining =
      conference?.committees.filter((c) => c.id !== id) ?? [];
    if (activeCommitteeId === id) {
      setActiveCommitteeId(remaining[0]?.id ?? null);
    }
    setConference((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        committees: prev.committees.filter((c) => c.id !== id),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const deleteConference = () => {
    clearStoredConference();
    setConference(null);
    setActiveCommitteeId(null);
  };

  const verifyManagementPassword = async (password: string) => {
    if (!conference?.managementPasswordHash) return true;
    return verifyPassword(password, conference.managementPasswordHash);
  };

  const createCommittee = (
    name: string,
    type: CommitteeType,
    topic: string,
    withDefaults = true
  ) => {
    const committee = createDefaultCommittee(name, type, topic, withDefaults);
    setConference((prev) => {
      const base = prev ?? createDefaultConference("PantherMUNC", new Date().getFullYear());
      return { ...base, committees: [...base.committees, committee] };
    });
    setActiveCommitteeId(committee.id);
    return committee.id;
  };

  const selectCommittee = (id: string | null) => setActiveCommitteeId(id);

  const updateCommittee = (committee: Committee) => {
    patchCommittee(committee.id, () => committee);
  };

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
        judgeScores: [
          ...c.judgeScores,
          createEmptyRubricScore(d.id, c.type),
        ],
        daisScores: [...c.daisScores, createEmptyRubricScore(d.id, c.type)],
      };
    });
  };

  const updateDelegate = (delegate: Delegate) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      delegates: c.delegates.map((d) =>
        d.id === delegate.id ? delegate : d
      ),
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
        return {
          ...rc,
          attendance,
          quorumMet: present > c.delegates.length / 2,
        };
      }),
    }));
  };

  const addMotion = (motion: Omit<Motion, "id" | "timestamp">) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      motions: [
        {
          ...motion,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
        },
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
        [motionId]: { speakerQueue: queue },
      },
    }));
  };

  const archiveMotionQueue = (passedMotionId: string) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => {
      const passedMotion =
        c.motions.find((m) => m.id === passedMotionId) ?? null;
      const sessionState = c.motionSessionState ?? {};
      const speakerQueue =
        passedMotion && isFormalSpeakingMotion(passedMotion)
          ? sessionState[passedMotionId]?.speakerQueue
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
      documents: [
        {
          ...doc,
          id: uuidv4(),
          amendments: [],
        },
        ...c.documents,
      ],
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
      const updated = c.documents.map((d) =>
        d.id === workingPaperId
          ? { ...d, type: "draft_resolution" as const, status: "submitted" as const, submittedAt: new Date().toISOString() }
          : d
      );
      return { ...c, documents: updated };
    });
  };

  const addSpeakingEvent = (
    event: Omit<SpeakingEvent, "id" | "timestamp">
  ) => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => ({
      ...c,
      speakingEvents: [
        {
          ...event,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
        },
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
      points: c.points.map((p) =>
        p.id === id ? { ...p, resolved: true } : p
      ),
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
        : {
            delegateId,
            scores,
            total,
            notes: notes ?? "",
            signed: false,
          };
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

  const exportJson = () => {
    if (conference) exportConferenceJson(conference);
  };

  const importJson = async (file: File) => {
    const data = await importConferenceJson(file);
    setConference(data);
    setActiveCommitteeId(data.committees[0]?.id ?? null);
  };

  return (
    <ConferenceContext.Provider
      value={{
        conference,
        activeCommittee,
        loading,
        initConference,
        updateConference,
        removeCommittee,
        deleteConference,
        verifyManagementPassword,
        createCommittee,
        selectCommittee,
        updateCommittee,
        addDelegate,
        updateDelegate,
        removeDelegate,
        startRollCall,
        updateRollCallStatus,
        addMotion,
        updateMotion,
        setMotionSpeakerQueue,
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
        exportJson,
        importJson,
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
