"use client";

import { useCallback } from "react";
import {
  committeeToData,
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
      await fetch("/api/conference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setConference((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    [setConference]
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
    [conferenceRef, versions, setConference, setActiveCommitteeId]
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

      let next = { ...committee };
      if (updates.name !== undefined) {
        const trimmed = updates.name.trim();
        if (!trimmed) return;
        next = { ...next, name: trimmed };
      }
      if (updates.topic !== undefined) {
        next = { ...next, topic: updates.topic.trim() };
      }

      const typeChanged =
        updates.type !== undefined && updates.type !== committee.type;
      if (updates.type !== undefined) {
        next = applyCommitteeTypeChange(next, updates.type);
      }

      const version = versions.current.get(committeeId) ?? 0;
      const body: {
        version: number;
        name?: string;
        topic?: string;
        type?: CommitteeType;
        data?: ReturnType<typeof committeeToData>;
      } = { version };

      if (updates.name !== undefined) body.name = next.name;
      if (updates.topic !== undefined) body.topic = next.topic;
      if (updates.type !== undefined) body.type = next.type;
      if (typeChanged) body.data = committeeToData(next);

      try {
        const r = await fetch(`/api/committees/${committeeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (r.ok) {
          const row: DbCommitteeRow = await r.json();
          versions.current.set(committeeId, row.version);
          const updated = rowToCommittee(row);
          setConference((prev) => {
            if (!prev) return prev;
            const updatedConf = {
              ...prev,
              committees: prev.committees.map((c) =>
                c.id === committeeId ? updated : c
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
        } else {
          setSyncError("Failed to save committee settings.");
        }
      } catch {
        setSyncError(
          "Failed to save committee settings — check your connection."
        );
      }
    },
    [conferenceRef, versions, loadCommitteeData, setConference, setSyncError]
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
