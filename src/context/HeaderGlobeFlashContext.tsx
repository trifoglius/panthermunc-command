"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useConference } from "@/context/ConferenceContext";

export type HeaderGlobeFlashKind =
  | "pass"
  | "fail"
  | "notification"
  | "timer"
  | null;

type HeaderGlobeFlashContextValue = {
  flash: HeaderGlobeFlashKind;
  flashKey: number;
  sustainedFlash: HeaderGlobeFlashKind;
  triggerFlash: (kind: Exclude<HeaderGlobeFlashKind, null>) => void;
  setSustainedFlash: (kind: HeaderGlobeFlashKind) => void;
};

const HeaderGlobeFlashContext =
  createContext<HeaderGlobeFlashContextValue | null>(null);

const FLASH_MS = 1100;

export function HeaderGlobeFlashProvider({ children }: { children: ReactNode }) {
  const [flash, setFlash] = useState<HeaderGlobeFlashKind>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [sustainedFlash, setSustainedFlash] =
    useState<HeaderGlobeFlashKind>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const triggerFlash = useCallback((kind: Exclude<HeaderGlobeFlashKind, null>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setFlashKey((key) => key + 1);
    setFlash(kind);
    timeoutRef.current = setTimeout(() => setFlash(null), FLASH_MS);
  }, []);

  const setSustainedFlashStable = useCallback((kind: HeaderGlobeFlashKind) => {
    setSustainedFlash(kind);
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  return (
    <HeaderGlobeFlashContext.Provider
      value={{
        flash,
        flashKey,
        sustainedFlash,
        triggerFlash,
        setSustainedFlash: setSustainedFlashStable,
      }}
    >
      {children}
    </HeaderGlobeFlashContext.Provider>
  );
}

export function useHeaderGlobeFlash() {
  const ctx = useContext(HeaderGlobeFlashContext);
  if (!ctx) {
    throw new Error(
      "useHeaderGlobeFlash must be used within HeaderGlobeFlashProvider"
    );
  }
  return ctx;
}

function buildStatusMap(
  conference: NonNullable<ReturnType<typeof useConference>["conference"]>
) {
  const map = new Map<string, string>();
  for (const committee of conference.committees) {
    for (const motion of committee.motions) {
      map.set(`m:${motion.id}`, motion.status);
    }
    for (const doc of committee.documents) {
      map.set(`d:${doc.id}`, doc.status);
    }
  }
  return map;
}

export function HeaderGlobeFlashWatcher() {
  const { conference } = useConference();
  const { triggerFlash } = useHeaderGlobeFlash();
  const prevRef = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    if (!conference) return;

    const current = buildStatusMap(conference);
    if (prevRef.current === null) {
      prevRef.current = current;
      return;
    }

    for (const [id, status] of current) {
      const prevStatus = prevRef.current.get(id);
      if (prevStatus === undefined || prevStatus === status) continue;

      if (status === "passed" || status === "adopted") {
        triggerFlash("pass");
      } else if (status === "failed") {
        triggerFlash("fail");
      }
    }

    prevRef.current = current;
  }, [conference, triggerFlash]);

  return null;
}
