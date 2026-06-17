"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionData } from "@/lib/auth-types";
import {
  committeeToData,
  rowToCommittee,
  emptyCommitteeStub,
  COMMITTEE_DATA_KEYS,
  type DbCommitteeRow,
} from "@/lib/committee-mappers";
import { COMMITTEE_POLL_MS } from "@/lib/sync-constants";
import { usePolling } from "@/hooks/usePolling";
import type { Committee, Conference } from "@/lib/types";
import type { CommitteeData } from "@/db/schema";
import type { CommitteeSyncEngine } from "./types";

export function useCommitteeSyncEngine(
  user: SessionData | null,
  authLoading: boolean
): CommitteeSyncEngine {
  const [conference, setConference] = useState<Conference | null>(null);
  const [activeCommitteeId, setActiveCommitteeId] = useState<string | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const loading =
    authLoading || (!!user && loadedForUserId !== user.userId);
  const [conferenceUnavailable, setConferenceUnavailable] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const conferenceRef = useRef<Conference | null>(null);
  useEffect(() => {
    conferenceRef.current = conference;
  }, [conference]);

  const versions = useRef<Map<string, number>>(new Map());
  const dirtyKeys = useRef<Map<string, Set<keyof CommitteeData>>>(new Map());
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadCommitteeData = useCallback(async (id: string, ifVersion?: number) => {
    try {
      const url =
        ifVersion !== undefined
          ? `/api/committees/${id}?ifVersion=${ifVersion}`
          : `/api/committees/${id}`;
      const r = await fetch(url);
      if (r.status === 304) return;
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

  useEffect(() => {
    if (authLoading || !user || loadedForUserId === user.userId) return;

    let cancelled = false;

    (async () => {
      try {
        const r = await fetch("/api/conference");
        if (!r.ok) {
          if (r.status === 404) {
            setConferenceUnavailable(true);
          }
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

        const targetId = user.committeeId ?? data.committees[0]?.id ?? null;
        if (targetId) {
          setActiveCommitteeId(targetId);
          await loadCommitteeData(targetId);
        }
      } finally {
        if (!cancelled) setLoadedForUserId(user.userId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, loadedForUserId, loadCommitteeData]);

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

  const activeCommittee = useMemo(
    () =>
      conference?.committees.find((c) => c.id === activeCommitteeId) ?? null,
    [conference, activeCommitteeId]
  );

  const syncCommittee = useCallback(
    (committeeId: string) => {
      const conf = conferenceRef.current;
      const committee = conf?.committees.find((c) => c.id === committeeId);
      if (!committee) return;

      const dirty = dirtyKeys.current.get(committeeId) ?? new Set<keyof CommitteeData>();
      dirtyKeys.current.set(committeeId, new Set());

      const fullData = committeeToData(committee);
      const partialData: Partial<CommitteeData> = {};
      for (const k of dirty) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (partialData as any)[k] = (fullData as any)[k];
      }
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

  const patchCommittee = useCallback(
    (committeeId: string, updater: (c: Committee) => Committee) => {
      setConference((prev) => {
        if (!prev) return prev;
        const oldC = prev.committees.find((c) => c.id === committeeId);
        const newC = oldC ? updater(oldC) : null;
        if (!newC || !oldC) return prev;

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

  const requireCommittee = useCallback(() => {
    if (!activeCommitteeId) throw new Error("No active committee");
    return activeCommitteeId;
  }, [activeCommitteeId]);

  const clearSyncError = useCallback(() => setSyncError(null), []);

  return {
    conference,
    activeCommittee,
    activeCommitteeId,
    loading,
    conferenceUnavailable,
    syncError,
    conferenceRef,
    versions,
    setConference,
    setActiveCommitteeId,
    setSyncError,
    clearSyncError,
    loadCommitteeData,
    loadAllCommitteeData,
    patchCommittee,
    requireCommittee,
  };
}
