"use client";

import { useCallback } from "react";
import {
  rowToCommittee,
  emptyCommitteeStub,
  type DbCommitteeRow,
} from "@/lib/committee-mappers";
import { applyCommitteeTypeChange } from "@/lib/committee-settings";
import type { Committee, CommitteeType, Conference } from "@/lib/types";
import type { CommitteeSyncEngine } from "./types";

export function useConferenceApiActions(sync: CommitteeSyncEngine) {
  const {
    conferenceRef,
    versions,
    baseData,
    activeCommitteeId,
    setConference,
    setActiveCommitteeId,
    setSyncError,
    loadCommitteeData,
    loadAllCommitteeData,
    patchCommittee,
  } = sync;

  const initConference = useCallback(
    async (name: string, year: number) => {
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
        version: data.version,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      setConference(next);
      conferenceRef.current = next;
    },
    [conferenceRef, setConference, setSyncError]
  );

  const updateConference = useCallback(
    async (updates: { name?: string; year?: number }) => {
      const version = conferenceRef.current?.version;
      const r = await fetch("/api/conference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, version }),
      });

      if (r.ok) {
        const row = await r.json();
        setConference((prev) =>
          prev ? { ...prev, ...updates, version: row.version } : prev
        );
        return;
      }

      if (r.status === 409) {
        // Adopt the server's latest metadata so the admin sees the concurrent
        // edit before retrying.
        const latest = (await r.json()).latest;
        if (latest) {
          setConference((prev) =>
            prev
              ? {
                  ...prev,
                  name: latest.name,
                  year: latest.year,
                  version: latest.version,
                }
              : prev
          );
        }
        setSyncError(
          "Conference details were changed elsewhere — your view has been refreshed."
        );
        return;
      }

      setSyncError("Failed to save conference details.");
    },
    [conferenceRef, setConference, setSyncError]
  );

  const createCommittee = useCallback(
    async (
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
      baseData.current.set(row.id, row.data);
      const committee = rowToCommittee(row);
      setConference((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, committees: [...prev.committees, committee] };
        conferenceRef.current = updated;
        return updated;
      });
      setActiveCommitteeId(row.id);
      return row.id;
    },
    [conferenceRef, versions, baseData, setConference, setActiveCommitteeId]
  );

  const selectCommittee = useCallback(
    async (id: string | null) => {
      setActiveCommitteeId(id);
      if (id) {
        await loadCommitteeData(id);
      }
    },
    [loadCommitteeData, setActiveCommitteeId]
  );

  const updateCommittee = useCallback(
    (committee: Committee) => {
      patchCommittee(committee.id, () => committee);
    },
    [patchCommittee]
  );

  const updateCommitteeSettings = useCallback(
    async (
      committeeId: string,
      updates: { name?: string; topic?: string; type?: CommitteeType }
    ) => {
      const committee = conferenceRef.current?.committees.find(
        (c) => c.id === committeeId
      );
      if (!committee) return;

      const trimmedName = updates.name?.trim();
      if (updates.name !== undefined && !trimmedName) return;

      const typeChanged =
        updates.type !== undefined && updates.type !== committee.type;

      // Metadata (name/topic/type) are committee columns and go through the
      // settings PATCH. Post-cutover we no longer send the JSONB blob here; a
      // type change's rubric reset is applied below via the normalized scoring
      // pipeline (patchCommittee → scoring-ops) instead of a whole-blob write.
      const version = versions.current.get(committeeId) ?? 0;
      const body: {
        version: number;
        name?: string;
        topic?: string;
        type?: CommitteeType;
      } = { version };

      if (updates.name !== undefined) body.name = trimmedName;
      if (updates.topic !== undefined) body.topic = updates.topic.trim();
      if (updates.type !== undefined) body.type = updates.type;

      try {
        const r = await fetch(`/api/committees/${committeeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (r.ok) {
          const row: DbCommitteeRow = await r.json();
          versions.current.set(committeeId, row.version);
          // Update only metadata fields; keep normalized floor/scoring/documents
          // that the raw blob no longer mirrors.
          setConference((prev) => {
            if (!prev) return prev;
            const updatedConf = {
              ...prev,
              committees: prev.committees.map((c) =>
                c.id === committeeId
                  ? {
                      ...c,
                      name: row.name,
                      topic: row.topic,
                      type: row.type as CommitteeType,
                    }
                  : c
              ),
            };
            conferenceRef.current = updatedConf;
            return updatedConf;
          });
        } else if (r.status === 409) {
          const conflict = await r.json();
          versions.current.set(
            committeeId,
            conflict.latest?.version ?? versions.current.get(committeeId) ?? 0
          );
          await loadCommitteeData(committeeId);
          setSyncError(
            "Another change was detected — your view has been refreshed."
          );
          return;
        } else {
          setSyncError("Failed to save committee settings.");
          return;
        }
      } catch {
        setSyncError(
          "Failed to save committee settings — check your connection."
        );
        return;
      }

      // Apply the rubric reset for a type change through the normalized scoring
      // pipeline so it lands in the scoring tables (not the deprecated blob).
      if (typeChanged && updates.type !== undefined) {
        patchCommittee(committeeId, (c) =>
          applyCommitteeTypeChange(c, updates.type as CommitteeType)
        );
      }
    },
    [
      conferenceRef,
      versions,
      loadCommitteeData,
      patchCommittee,
      setConference,
      setSyncError,
    ]
  );

  const removeCommittee = useCallback(
    async (id: string) => {
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
    },
    [
      activeCommitteeId,
      conferenceRef,
      loadCommitteeData,
      setActiveCommitteeId,
      setConference,
    ]
  );

  const deleteConference = useCallback(async () => {
    await fetch("/api/conference", { method: "DELETE" });
    await fetch("/api/auth/logout", { method: "POST" });
    setConference(null);
    setActiveCommitteeId(null);
    conferenceRef.current = null;
    window.location.href = "/";
  }, [conferenceRef, setActiveCommitteeId, setConference]);

  return {
    initConference,
    updateConference,
    createCommittee,
    selectCommittee,
    updateCommittee,
    updateCommitteeSettings,
    removeCommittee,
    deleteConference,
    loadAllCommitteeData,
  };
}
