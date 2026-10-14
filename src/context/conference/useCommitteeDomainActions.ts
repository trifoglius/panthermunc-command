"use client";

import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import * as delegateMutations from "@/lib/committee-mutations/delegates";
import * as rollCallMutations from "@/lib/committee-mutations/roll-call";
import * as motionMutations from "@/lib/committee-mutations/motions";
import * as documentMutations from "@/lib/committee-mutations/documents";
import * as speakingMutations from "@/lib/committee-mutations/speaking";
import * as pointMutations from "@/lib/committee-mutations/points";
import * as sessionMutations from "@/lib/committee-mutations/session";
import type {
  Amendment,
  Delegate,
  Document,
  FloorAllotment,
  Motion,
  Point,
  PositionPaperStatus,
  RollCallStatus,
  SpeakingEvent,
  VoteContext,
  VoteMode,
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
          disruptivity: motion.disruptivity ?? 0,
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

  const beginProceduralMotionVote = useCallback(
    (motion: Motion) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.beginProceduralMotionVote(c, motion)
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
          signatories: doc.signatories ?? [],
          authorPanel: doc.authorPanel ?? [],
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

  const addAmendment = useCallback(
    (documentId: string, amendment: Omit<Amendment, "id">) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        documentMutations.addAmendment(c, documentId, {
          ...amendment,
          id: uuidv4(),
        })
      );
    },
    [patchCommittee, requireCommittee]
  );

  const updateAmendment = useCallback(
    (documentId: string, amendment: Amendment) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        documentMutations.updateAmendment(c, documentId, amendment)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const addSponsor = useCallback(
    (documentId: string, delegateId: string, amendmentId?: string) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        documentMutations.addSponsor(c, documentId, delegateId, amendmentId)
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
          type: "order",
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          resolved: false,
          appealStatus: "none",
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

  const setPointRuling = useCallback(
    (pointId: string, chairRuling: string) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        pointMutations.setPointRuling(c, pointId, chairRuling)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const startAppeal = useCallback(
    (pointId: string, chairRuling: string) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        pointMutations.startAppeal(c, pointId, chairRuling)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const resolveAppeal = useCallback(
    (
      pointId: string,
      votesFor: number,
      votesAgainst: number,
      votesAbstain?: number
    ) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        pointMutations.resolveAppeal(
          c,
          pointId,
          votesFor,
          votesAgainst,
          votesAbstain
        )
      );
    },
    [patchCommittee, requireCommittee]
  );

  const setAgendaAdopted = useCallback(
    (adopted: boolean, topic?: string) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.setAgendaAdopted(
          c,
          adopted,
          topic,
          new Date().toISOString()
        )
      );
    },
    [patchCommittee, requireCommittee]
  );

  const setSpeakingTime = useCallback(
    (speakingSec: number) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.setSpeakingTime(c, speakingSec)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const setGeneralDebateQueue = useCallback(
    (speakerQueue: string[], currentIndex?: number) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.setGeneralDebateQueue(c, speakerQueue, currentIndex)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const archiveAndClearSpeakersList = useCallback(() => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) =>
      sessionMutations.archiveAndClearSpeakersList(
        c,
        uuidv4(),
        new Date().toISOString()
      )
    );
  }, [patchCommittee, requireCommittee]);

  const setFloorAllotment = useCallback(
    (floorAllotment: FloorAllotment | undefined) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.setFloorAllotment(c, floorAllotment)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const setAmendmentPeriod = useCallback(
    (
      documentId: string,
      totalSec: number,
      active: boolean,
      endsAt?: string
    ) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.setAmendmentPeriod(
          c,
          documentId,
          totalSec,
          active,
          endsAt
        )
      );
    },
    [patchCommittee, requireCommittee]
  );

  const clearAmendmentPeriod = useCallback(() => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => sessionMutations.clearAmendmentPeriod(c));
  }, [patchCommittee, requireCommittee]);

  const setCaucusSpeakerQueue = useCallback(
    (queue: string[]) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.setCaucusSpeakerQueue(c, queue)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const advanceCaucusSpeaker = useCallback(() => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => sessionMutations.advanceCaucusSpeaker(c));
  }, [patchCommittee, requireCommittee]);

  const setCaucusSpeakOrder = useCallback(
    (speakOrder: "first" | "last" | undefined) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.setCaucusSpeakOrder(c, speakOrder)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const startModeratedCaucus = useCallback(
    (motion: Motion) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.startModeratedCaucusFromMotion(c, motion)
      );
    },
    [patchCommittee, requireCommittee]
  );

  const clearActiveCaucus = useCallback(() => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => sessionMutations.clearActiveCaucus(c));
  }, [patchCommittee, requireCommittee]);

  const clearSuspension = useCallback(() => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => sessionMutations.clearSuspension(c));
  }, [patchCommittee, requireCommittee]);

  const openVote = useCallback(
    (documentId: string, mode: VoteMode = "recorded") => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.openVoteContext(
          c,
          sessionMutations.createDefaultVoteContext(documentId, mode)
        )
      );
    },
    [patchCommittee, requireCommittee]
  );

  const openAmendmentVote = useCallback(
    (documentId: string, amendmentId: string, mode: VoteMode = "recorded") => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) =>
        sessionMutations.openVoteContext(c, {
          target: {
            type: "amendment",
            id: amendmentId,
            parentDocumentId: documentId,
          },
          mode,
          eov: {
            beforeOpen: false,
            afterOpen: false,
            beforeSpeakers: [],
            afterSpeakers: [],
          },
          tallies: { yes: 0, no: 0, abstain: 0 },
          recordedVotes: {},
        })
      );
    },
    [patchCommittee, requireCommittee]
  );

  const patchVoteContext = useCallback(
    (patch: Partial<VoteContext>) => {
      const cid = requireCommittee();
      patchCommittee(cid, (c) => sessionMutations.patchVoteContext(c, patch));
    },
    [patchCommittee, requireCommittee]
  );

  const clearVoteContext = useCallback(() => {
    const cid = requireCommittee();
    patchCommittee(cid, (c) => sessionMutations.clearVoteContext(c));
  }, [patchCommittee, requireCommittee]);

  return {
    addDelegate,
    updateDelegate,
    removeDelegate,
    startRollCall,
    updateRollCallStatus,
    addMotion,
    updateMotion,
    beginProceduralMotionVote,
    archiveMotionQueue,
    addDocument,
    updateDocument,
    promoteToDraftResolution,
    addAmendment,
    updateAmendment,
    addSponsor,
    addSpeakingEvent,
    addPoint,
    resolvePoint,
    setPointRuling,
    startAppeal,
    resolveAppeal,
    setAgendaAdopted,
    setSpeakingTime,
    setGeneralDebateQueue,
    archiveAndClearSpeakersList,
    setFloorAllotment,
    setAmendmentPeriod,
    clearAmendmentPeriod,
    setCaucusSpeakerQueue,
    advanceCaucusSpeaker,
    setCaucusSpeakOrder,
    startModeratedCaucus,
    clearActiveCaucus,
    clearSuspension,
    openVote,
    openAmendmentVote,
    patchVoteContext,
    clearVoteContext,
  };
}
