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
import { deepEqualData, mergeServerIntoLocal } from "@/lib/committee-sync/conflict";
import { classifyServerUpdate } from "@/lib/committee-sync/pollMerge";
import { createSaveQueue } from "@/lib/committee-sync/saveQueue";
import { diffFloor, FLOOR_KEY_SET, FLOOR_KEYS } from "@/lib/committee-sync/floor-diff";
import {
  emptyFloorEntityVersions,
  type FloorEntityVersions,
  type FloorOpsResult,
} from "@/lib/committee-sync/floor-ops-types";
import {
  diffScoring,
  SCORING_ENTITY_KEY_SET,
  SCORING_ENTITY_KEYS,
} from "@/lib/committee-sync/scoring-diff";
import {
  emptyScoringEntityVersions,
  type ScoringEntityVersions,
  type ScoringOpsResult,
} from "@/lib/committee-sync/scoring-ops-types";
import { COMMITTEE_POLL_MS } from "@/lib/sync-constants";
import { usePolling } from "@/hooks/usePolling";
import type { Committee, Conference } from "@/lib/types";
import type { CommitteeData } from "@/db/schema";
import type { CommitteeSyncEngine } from "./types";

/** Max automatic rebase-and-retry attempts before a hard refresh on 409. */
const SAVE_MAX_RETRIES = 3;

const CONFLICT_MESSAGE =
  "Another change was detected — your view has been refreshed.";

type CommitteeGetResponse = DbCommitteeRow & {
  entityVersions?: FloorEntityVersions;
  scoringEntityVersions?: ScoringEntityVersions;
};

export function useCommitteeSyncEngine(
  user: SessionData | null,
  authLoading: boolean
): CommitteeSyncEngine {
  const [conference, setConference] = useState<Conference | null>(null);
  const [activeCommitteeId, setActiveCommitteeId] = useState<string | null>(null);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const loading = authLoading || (!!user && loadedForUserId !== user.userId);
  const [conferenceUnavailable, setConferenceUnavailable] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const conferenceRef = useRef<Conference | null>(null);
  useEffect(() => {
    conferenceRef.current = conference;
  }, [conference]);

  const versions = useRef<Map<string, number>>(new Map());
  const dirtyKeys = useRef<Map<string, Set<keyof CommitteeData>>>(new Map());
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Last-known clean server snapshot per committee, used to distinguish
  // disjoint-key conflicts (safe to rebase) from same-key conflicts (must
  // hard-refresh) and to diff floor entities on save.
  const baseData = useRef<Map<string, CommitteeData>>(new Map());
  // Per-committee per-entity versions for normalized floor writes.
  const entityVersions = useRef<Map<string, FloorEntityVersions>>(new Map());
  // Per-committee per-entity versions for normalized scoring writes (Phase 5).
  const scoringVersions = useRef<Map<string, ScoringEntityVersions>>(new Map());
  // Serializes saves per committee so overlapping edits from one client
  // coalesce into ordered saves instead of racing each other into conflicts.
  const saveQueue = useRef(createSaveQueue<string>());

  const replaceCommittee = useCallback((id: string, next: Committee) => {
    setConference((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        committees: prev.committees.map((c) => (c.id === id ? next : c)),
      };
      conferenceRef.current = updated;
      return updated;
    });
  }, []);

  // Fetch the assembled committee and reconcile it with local state. `bypass`
  // lets the save path force a hard refresh even while its own save is the
  // in-flight work (polls otherwise skip in-flight committees).
  const applyServerCommittee = useCallback(
    async (id: string, ifVersion?: number, bypass = false) => {
      if (!bypass && saveQueue.current.isInFlight(id)) return;
      try {
        const url =
          ifVersion !== undefined
            ? `/api/committees/${id}?ifVersion=${ifVersion}`
            : `/api/committees/${id}`;
        const r = await fetch(url);
        if (r.status === 304) return;
        if (r.status === 404) {
          // The committee was deleted (admin-only). Drop it from local state and
          // clear the active selection if it pointed here.
          versions.current.delete(id);
          baseData.current.delete(id);
          entityVersions.current.delete(id);
          scoringVersions.current.delete(id);
          dirtyKeys.current.delete(id);
          setConference((prev) => {
            if (!prev) return prev;
            const remaining = prev.committees.filter((c) => c.id !== id);
            if (remaining.length === prev.committees.length) return prev;
            const updated = { ...prev, committees: remaining };
            conferenceRef.current = updated;
            return updated;
          });
          setActiveCommitteeId((current) => (current === id ? null : current));
          setSyncError("This committee is no longer available.");
          return;
        }
        if (!r.ok) return;
        const row: CommitteeGetResponse = await r.json();
        const serverData = row.data;
        const dirty = dirtyKeys.current.get(id) ?? new Set<keyof CommitteeData>();
        const decision = classifyServerUpdate(
          baseData.current.get(id),
          serverData,
          dirty
        );

        const storeServerVersions = () => {
          versions.current.set(id, row.version);
          baseData.current.set(id, serverData);
          entityVersions.current.set(
            id,
            row.entityVersions ?? emptyFloorEntityVersions()
          );
          scoringVersions.current.set(
            id,
            row.scoringEntityVersions ?? emptyScoringEntityVersions()
          );
        };

        if (decision === "replace") {
          storeServerVersions();
          replaceCommittee(id, rowToCommittee(row));
          return;
        }

        if (decision === "conflict") {
          storeServerVersions();
          dirtyKeys.current.set(id, new Set());
          replaceCommittee(id, rowToCommittee(row));
          setSyncError(CONFLICT_MESSAGE);
          return;
        }

        // Disjoint: merge only the non-dirty server keys, keep local edits.
        storeServerVersions();
        setConference((prev) => {
          if (!prev) return prev;
          const local = prev.committees.find((c) => c.id === id);
          if (!local) return prev;
          const merged = mergeServerIntoLocal(local, serverData, dirty);
          const updated = {
            ...prev,
            committees: prev.committees.map((c) => (c.id === id ? merged : c)),
          };
          conferenceRef.current = updated;
          return updated;
        });
      } catch {
        // non-fatal
      }
    },
    [replaceCommittee]
  );

  const loadCommitteeData = useCallback(
    (id: string, ifVersion?: number) => applyServerCommittee(id, ifVersion),
    [applyServerCommittee]
  );

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
          version: data.version,
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
    () => conference?.committees.find((c) => c.id === activeCommitteeId) ?? null,
    [conference, activeCommitteeId]
  );

  // Removes keys from the dirty set that were saved and not re-edited during the
  // request (comparing the committed snapshot to current local state).
  const clearSavedKeys = useCallback(
    (
      committeeId: string,
      savedKeys: Array<keyof CommitteeData>,
      snapshot: CommitteeData
    ) => {
      const current = conferenceRef.current?.committees.find(
        (c) => c.id === committeeId
      );
      const currentData = current ? committeeToData(current) : snapshot;
      const remaining =
        dirtyKeys.current.get(committeeId) ?? new Set<keyof CommitteeData>();
      for (const k of savedKeys) {
        if (deepEqualData(currentData[k], snapshot[k])) {
          remaining.delete(k);
        }
      }
      dirtyKeys.current.set(committeeId, remaining);
    },
    []
  );

  // Saves normalized floor edits as entity ops. Returns false if the caller
  // should abort the rest of the save (hard refresh / error already handled).
  const saveFloor = useCallback(
    async (committeeId: string, localData: CommitteeData): Promise<boolean> => {
      const base = baseData.current.get(committeeId);
      if (!base) {
        // No clean base to diff against; refresh to establish one.
        await applyServerCommittee(committeeId, undefined, true);
        return false;
      }
      const versionsMap =
        entityVersions.current.get(committeeId) ?? emptyFloorEntityVersions();
      const ops = diffFloor(base, localData, versionsMap);
      if (ops.length === 0) {
        clearSavedKeys(committeeId, [...FLOOR_KEYS], localData);
        return true;
      }

      let r: Response;
      try {
        r = await fetch(`/api/committees/${committeeId}/floor-ops`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ops }),
        });
      } catch {
        setSyncError("Failed to save — check your connection.");
        return false;
      }

      if (!r.ok) {
        if (r.status === 404) {
          setSyncError("This committee is no longer available.");
        } else {
          setSyncError("Failed to save committee changes.");
        }
        return false;
      }

      const res: FloorOpsResult = await r.json();
      versions.current.set(committeeId, res.committeeVersion);
      entityVersions.current.set(committeeId, res.entityVersions);

      if (res.conflict) {
        dirtyKeys.current.set(committeeId, new Set());
        await applyServerCommittee(committeeId, undefined, true);
        setSyncError(CONFLICT_MESSAGE);
        return false;
      }

      // Advance the base for floor keys to the just-saved local state so the
      // re-sync below doesn't treat our own accepted edits as a conflict.
      const currentBase = baseData.current.get(committeeId) ?? localData;
      const nextBase: CommitteeData = { ...currentBase };
      const nextBaseRecord = nextBase as unknown as Record<string, unknown>;
      const localRecord = localData as unknown as Record<string, unknown>;
      for (const k of FLOOR_KEYS) {
        nextBaseRecord[k] = localRecord[k];
      }
      baseData.current.set(committeeId, nextBase);
      clearSavedKeys(committeeId, [...FLOOR_KEYS], localData);

      // Re-sync from the authoritative assembled view so we also pick up other
      // chairs' entity data (and their fresh versions); without this, our entity
      // versions would advance past data we haven't seen and a later edit could
      // clobber a concurrent change.
      await applyServerCommittee(committeeId, undefined, true);
      return true;
    },
    [applyServerCommittee, clearSavedKeys]
  );

  // Saves normalized scoring edits as entity ops (Phase 5). Decoupled from the
  // floor/committee version, so it never conflicts with concurrent floor edits.
  // Returns false if the caller should abort the rest of the save.
  const saveScoring = useCallback(
    async (committeeId: string, localData: CommitteeData): Promise<boolean> => {
      const base = baseData.current.get(committeeId);
      if (!base) {
        await applyServerCommittee(committeeId, undefined, true);
        return false;
      }
      const versionsMap =
        scoringVersions.current.get(committeeId) ?? emptyScoringEntityVersions();
      const ops = diffScoring(base, localData, versionsMap);
      if (ops.length === 0) {
        clearSavedKeys(committeeId, [...SCORING_ENTITY_KEYS], localData);
        return true;
      }

      let r: Response;
      try {
        r = await fetch(`/api/committees/${committeeId}/scoring-ops`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ops }),
        });
      } catch {
        setSyncError("Failed to save — check your connection.");
        return false;
      }

      if (!r.ok) {
        if (r.status === 404) {
          setSyncError("This committee is no longer available.");
        } else if (r.status === 403) {
          setSyncError("You are not authorized to edit scoring.");
        } else {
          setSyncError("Failed to save scoring changes.");
        }
        return false;
      }

      const res: ScoringOpsResult = await r.json();
      versions.current.set(committeeId, res.committeeVersion);
      scoringVersions.current.set(committeeId, res.scoringEntityVersions);

      if (res.conflict) {
        dirtyKeys.current.set(committeeId, new Set());
        await applyServerCommittee(committeeId, undefined, true);
        setSyncError(CONFLICT_MESSAGE);
        return false;
      }

      // Advance the base for scoring keys to the just-saved local state so the
      // re-sync below doesn't treat our own accepted edits as a conflict.
      const currentBase = baseData.current.get(committeeId) ?? localData;
      const nextBase: CommitteeData = { ...currentBase };
      const nextBaseRecord = nextBase as unknown as Record<string, unknown>;
      const localRecord = localData as unknown as Record<string, unknown>;
      for (const k of SCORING_ENTITY_KEYS) {
        nextBaseRecord[k] = localRecord[k];
      }
      baseData.current.set(committeeId, nextBase);
      clearSavedKeys(committeeId, [...SCORING_ENTITY_KEYS], localData);

      // Re-sync from the authoritative assembled view to pick up other scorers'
      // entity data and fresh versions.
      await applyServerCommittee(committeeId, undefined, true);
      return true;
    },
    [applyServerCommittee, clearSavedKeys]
  );

  // Saves non-floor, non-scoring edits (settings) via the blob PATCH path, with
  // disjoint-key rebase / same-key hard-refresh per Phase 1 policy.
  const saveBlob = useCallback(
    async (
      committeeId: string,
      otherDirty: Array<keyof CommitteeData>
    ): Promise<void> => {
      const otherSet = new Set(otherDirty);
      for (let attempt = 0; attempt <= SAVE_MAX_RETRIES; attempt++) {
        const committee = conferenceRef.current?.committees.find(
          (c) => c.id === committeeId
        );
        if (!committee) return;

        const localData = committeeToData(committee);
        const partialData: Partial<CommitteeData> = {};
        const partialRecord = partialData as unknown as Record<string, unknown>;
        const localRecord = localData as unknown as Record<string, unknown>;
        for (const k of otherSet) partialRecord[k] = localRecord[k];

        const version = versions.current.get(committeeId) ?? 0;
        let r: Response;
        try {
          r = await fetch(`/api/committees/${committeeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ version, data: partialData }),
          });
        } catch {
          setSyncError("Failed to save — check your connection.");
          return;
        }

        if (r.ok) {
          const row: DbCommitteeRow = await r.json();
          versions.current.set(committeeId, row.version);
          // Advance the base only for the non-floor keys we saved. Floor base is
          // owned by the floor-ops path; overwriting it here (from the mirror)
          // could make a later floor diff revert another chair's edits.
          const nextBase = {
            ...(baseData.current.get(committeeId) ?? row.data),
          };
          const nextBaseRecord = nextBase as unknown as Record<string, unknown>;
          const serverRecord = row.data as unknown as Record<string, unknown>;
          for (const k of otherSet) nextBaseRecord[k] = serverRecord[k];
          baseData.current.set(committeeId, nextBase);
          clearSavedKeys(committeeId, [...otherSet], localData);
          return;
        }

        if (r.status === 409) {
          let latest: DbCommitteeRow | undefined;
          try {
            latest = (await r.json()).latest;
          } catch {
            // no body
          }
          if (!latest) {
            dirtyKeys.current.set(committeeId, new Set());
            await applyServerCommittee(committeeId, undefined, true);
            setSyncError(CONFLICT_MESSAGE);
            return;
          }

          // The blob is settings-only post-cutover, so only the settings keys of
          // `latest.data` are authoritative. If none of OUR dirty settings keys
          // changed on the server, the version bump came from another domain
          // (floor/scoring) — just adopt the new version and retry. If one did
          // change, it's a genuine same-key settings conflict → hard refresh.
          const base = baseData.current.get(committeeId);
          const latestRecord = latest.data as unknown as Record<string, unknown>;
          const baseRecord = base as unknown as Record<string, unknown> | undefined;
          const overlap = [...otherSet].some(
            (k) => !deepEqualData(baseRecord?.[k], latestRecord[k])
          );

          if (!overlap && attempt < SAVE_MAX_RETRIES) {
            versions.current.set(committeeId, latest.version);
            if (base) {
              const nextBase = { ...base } as unknown as Record<string, unknown>;
              for (const k of otherSet) nextBase[k] = latestRecord[k];
              baseData.current.set(committeeId, nextBase as unknown as CommitteeData);
            }
            continue;
          }

          // Hard refresh from the assembled view (not the raw blob, whose
          // floor/scoring keys are no longer mirrored post-cutover).
          versions.current.set(committeeId, latest.version);
          dirtyKeys.current.set(committeeId, new Set());
          await applyServerCommittee(committeeId, undefined, true);
          setSyncError(CONFLICT_MESSAGE);
          return;
        }

        setSyncError("Failed to save — check your connection.");
        return;
      }
    },
    [applyServerCommittee, clearSavedKeys]
  );

  const performSave = useCallback(
    async (committeeId: string): Promise<void> => {
      const committee = conferenceRef.current?.committees.find(
        (c) => c.id === committeeId
      );
      if (!committee) return;

      const dirty =
        dirtyKeys.current.get(committeeId) ?? new Set<keyof CommitteeData>();
      if (dirty.size === 0) return;

      const localData = committeeToData(committee);
      const floorDirty = [...dirty].filter((k) => FLOOR_KEY_SET.has(k));
      const scoringDirty = [...dirty].filter((k) =>
        SCORING_ENTITY_KEY_SET.has(k)
      );
      const otherDirty = [...dirty].filter(
        (k) => !FLOOR_KEY_SET.has(k) && !SCORING_ENTITY_KEY_SET.has(k)
      );

      // Floor and scoring first so the committee version they bump is threaded
      // into the subsequent blob PATCH (avoiding a self-inflicted 409).
      if (floorDirty.length > 0) {
        const proceed = await saveFloor(committeeId, localData);
        if (!proceed) return;
      }
      if (scoringDirty.length > 0) {
        const proceed = await saveScoring(committeeId, localData);
        if (!proceed) return;
      }
      if (otherDirty.length > 0) {
        await saveBlob(committeeId, otherDirty);
      }
    },
    [saveFloor, saveScoring, saveBlob]
  );

  const syncCommittee = useCallback(
    (committeeId: string): Promise<void> =>
      saveQueue.current.run(committeeId, () => performSave(committeeId)),
    [performSave]
  );

  const scheduleSave = useCallback(
    (committeeId: string) => {
      const existing = saveTimers.current.get(committeeId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        saveTimers.current.delete(committeeId);
        void syncCommittee(committeeId);
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
    baseData,
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
