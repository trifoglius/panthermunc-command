import type { Committee, Delegate } from "@/lib/types";

export function addDelegate(
  committee: Committee,
  delegate: Delegate
): Committee {
  return {
    ...committee,
    delegates: [...committee.delegates, delegate],
  };
}

export function updateDelegate(
  committee: Committee,
  delegate: Delegate
): Committee {
  return {
    ...committee,
    delegates: committee.delegates.map((d) =>
      d.id === delegate.id ? delegate : d
    ),
  };
}

export function removeDelegate(committee: Committee, id: string): Committee {
  return {
    ...committee,
    delegates: committee.delegates.filter((d) => d.id !== id),
  };
}
