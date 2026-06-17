import type {
  Committee,
  RollCallSession,
  RollCallStatus,
} from "@/lib/types";

export function startRollCall(
  committee: Committee,
  session: RollCallSession
): Committee {
  return { ...committee, rollCalls: [session, ...committee.rollCalls] };
}

export function updateRollCallStatus(
  committee: Committee,
  sessionId: string,
  delegateId: string,
  status: RollCallStatus
): Committee {
  return {
    ...committee,
    rollCalls: committee.rollCalls.map((rc) => {
      if (rc.id !== sessionId) return rc;
      const attendance = { ...rc.attendance, [delegateId]: status };
      const present = Object.values(attendance).filter(
        (s) => s === "present" || s === "present_voting"
      ).length;
      return {
        ...rc,
        attendance,
        quorumMet: present > committee.delegates.length / 2,
      };
    }),
  };
}
