"use client";

import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import * as delegateMutations from "@/lib/committee-mutations/delegates";
import * as rollCallMutations from "@/lib/committee-mutations/roll-call";
import * as motionMutations from "@/lib/committee-mutations/motions";
import * as documentMutations from "@/lib/committee-mutations/documents";
import * as speakingMutations from "@/lib/committee-mutations/speaking";
import * as pointMutations from "@/lib/committee-mutations/points";
import * as scoringMutations from "@/lib/committee-mutations/scoring";
import type {
  Delegate,
  Document,
  Motion,
  Point,
  PositionPaperStatus,
  PaperVoteRecord,
  DelegatePaperVote,
  RollCallStatus,
  ScorerRole,
  SpeakingEvent,
} from "@/lib/types";
import type { CommitteeSyncEngine } from "./types";

export function useCommitteeDomainActions(sync: CommitteeSyncEngine) {
  const { patchCommittee, requireCommittee } = sync;

  const addDelegate = useCallback(
    (
      country: string,
      delegateName: string,
      ppStatus: PositionPaperStatus = "none"
    ) => {
      const cid = requireCommittee();
      const delegate: Delegate = {
        id: uuidv4(),
        country,
        delegateName,
        positionPaperStatus: ppStatus,
      };
      patchCommittee(cid, (c) =>
        delegateMutations.addDelegate(c, delegate)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const updateDelegate = useCallback(
    (delegate: Delegate) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        delegateMutations.updateDelegate(c, delegate)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const removeDelegate = useCallback(
    (id: string) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) => delegateMutations.removeDelegate(c, id));
    },
    [patchCommittee, requireCommittee]
  );

  const startRollCall = useCallback(
    (label: string) => {
      const cid = requireCommittee();
      const sessionId = uuidv4();
      patchCommittee(cid, (c) => {
        const attendance: Record<string, RollCallStatus> = {};
        c.delegates.forEach((d) => {
          attendance[d.id] = "absent";
        });
        return rollCallMutations.startRollCall(c, {
          id: sessionId,
          label,
          timestamp: new Date().toISOString(),
          attendance,
          quorumMet: false,
        });
      });
      return sessionId;
    },
    [patchCommittee, requireCommittee]
  );

  const updateRollCallStatus = useCallback(
    (sessionId: string, delegateId: string, status: RollCallStatus) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        rollCallMutations.updateRollCallStatus(c, sessionId, delegateId, status)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const addMotion = useCallback(
    (motion: Omit<Motion, "id" | "timestamp">) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        motionMutations.addMotion(c, {
          ...motion,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
        })
      );
    },
    [patchCommittee, requireCommittee]
  );

  const updateMotion = useCallback(
    (motion: Motion) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) => motionMutations.updateMotion(c, motion));
    },
    [patchCommittee, requireCommittee]
  );

  const setMotionSpeakerQueue = useCallback(
    (motionId: string, queue: string[]) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        motionMutations.setMotionSpeakerQueue(c, motionId, queue)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const setMotionVotingSpeakers = useCallback(
    (motionId: string, speakersFor: string[], speakersAgainst: string[]) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        motionMutations.setMotionVotingSpeakers(
          c,
          motionId,
          speakersFor,
          speakersAgainst
        )
      );
    },
    [patchCommittee, requireCommittee]
  );

  const setMotionPaperVotes = useCallback(
    (motionId: string, paperVotes: PaperVoteRecord[]) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        motionMutations.setMotionPaperVotes(c, motionId, paperVotes)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const setMotionRollCallVote = useCallback(
    (
      motionId: string,
      documentId: string,
      delegateId: string,
      vote: DelegatePaperVote
    ) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        motionMutations.setMotionRollCallVote(
          c,
          motionId,
          documentId,
          delegateId,
          vote
        )
      );
    },
    [patchCommittee, requireCommittee]
  );

  const setMotionPresentationDelegates = useCallback(
    (
      motionId: string,
      presentationDelegates: string[],
      qaDelegates: string[]
    ) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        motionMutations.setMotionPresentationDelegates(
          c,
          motionId,
          presentationDelegates,
          qaDelegates
        )
      );
    },
    [patchCommittee, requireCommittee]
  );

  const archiveMotionQueue = useCallback(
    (passedMotionId: string) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        motionMutations.archiveMotionQueue(
          c,
          passedMotionId,
          uuidv4(),
          new Date().toISOString()
        )
      );
    },
    [patchCommittee, requireCommittee]
  );

  const addDocument = useCallback(
    (doc: Omit<Document, "id" | "amendments">) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        documentMutations.addDocument(c, {
          ...doc,
          id: uuidv4(),
          amendments: [],
        })
      );
    },
    [patchCommittee, requireCommittee]
  );

  const updateDocument = useCallback(
    (doc: Document) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) => documentMutations.updateDocument(c, doc));
    },
    [patchCommittee, requireCommittee]
  );

  const promoteToDraftResolution = useCallback(
    (workingPaperId: string) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        documentMutations.promoteToDraftResolution(
          c,
          workingPaperId,
          new Date().toISOString()
        )
      );
    },
    [patchCommittee, requireCommittee]
  );

  const addSpeakingEvent = useCallback(
    (event: Omit<SpeakingEvent, "id" | "timestamp">) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        speakingMutations.addSpeakingEvent(c, {
          ...event,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
        })
      );
    },
    [patchCommittee, requireCommittee]
  );

  const addPoint = useCallback(
    (point: Omit<Point, "id" | "timestamp" | "resolved">) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        pointMutations.addPoint(c, {
          ...point,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          resolved: false,
        })
      );
    },
    [patchCommittee, requireCommittee]
  );

  const resolvePoint = useCallback(
    (id: string) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) => pointMutations.resolvePoint(c, id));
    },
    [patchCommittee, requireCommittee]
  );

  const updateRubricScore = useCallback(
    (
      role: ScorerRole,
      delegateId: string,
      scores: Record<string, number>,
      notes?: string
    ) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        scoringMutations.updateRubricScore(c, role, delegateId, scores, notes)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const signScores = useCallback(
    (role: ScorerRole) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        scoringMutations.signScores(c, role, new Date().toISOString())
      );
    },
    [patchCommittee, requireCommittee]
  );

  const updatePositionPaperScore = useCallback(
    (delegateId: string, score: number, notes?: string) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        scoringMutations.updatePositionPaperScore(c, delegateId, score, notes)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const setVcRecipient = useCallback(
    (delegateId: string | undefined) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        scoringMutations.setVcRecipient(c, delegateId)
      );
    },
    [patchCommittee, requireCommittee]
  );

  return {
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
    setMotionRollCallVote,
    setMotionPresentationDelegates,
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
  };
}
