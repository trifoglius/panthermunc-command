"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { useCommitteeSyncEngine } from "./useCommitteeSyncEngine";
import { useConferenceApiActions } from "./useConferenceApiActions";
import { useCommitteeDomainActions } from "./useCommitteeDomainActions";
import type { ConferenceContextValue } from "./types";

const ConferenceContext = createContext<ConferenceContextValue | null>(null);

export function ConferenceProvider({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth();
  const sync = useCommitteeSyncEngine(user, authLoading);
  const apiActions = useConferenceApiActions(sync);
  const domainActions = useCommitteeDomainActions(sync);

  const value = useMemo<ConferenceContextValue>(
    () => ({
      conference: sync.conference,
      activeCommittee: sync.activeCommittee,
      loading: user ? sync.loading : false,
      conferenceUnavailable: sync.conferenceUnavailable,
      syncError: sync.syncError,
      clearSyncError: sync.clearSyncError,
      ...apiActions,
      ...domainActions,
    }),
    [sync, apiActions, domainActions, user]
  );

  return (
    <ConferenceContext.Provider value={value}>
      {children}
    </ConferenceContext.Provider>
  );
}

export function useConference() {
  const ctx = useContext(ConferenceContext);
  if (!ctx) throw new Error("useConference must be used within provider");
  return ctx;
}
