"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DelegateMultiSelect } from "@/components/delegates/DelegateMultiSelect";
import { TimerCard } from "@/components/motions/TimerControls";
import { useConference } from "@/context/ConferenceContext";
import { useCountdown } from "@/hooks/useCountdown";
import { formatTime, type MotionTimerConfig } from "@/lib/motion-timers";
import type { Motion } from "@/lib/types";
import { parseDocumentOrder } from "@/lib/voting";
import { Button } from "@/components/ui";

interface PresentationSessionProps {
  motion: Motion;
  config: MotionTimerConfig;
}

function LoggedPhaseTimer({
  label,
  initialSeconds,
  phaseKind,
  selectedDelegateIds,
  eventType,
  onLog,
}: {
  label: string;
  initialSeconds: number;
  phaseKind: "presentation" | "qa";
  selectedDelegateIds: string[];
  eventType: string;
  onLog: (delegateIds: string[], eventType: string, durationSeconds: number) => void;
}) {
  const { seconds, running, start, pause, reset } = useCountdown(initialSeconds);
  const [isLogged, setIsLogged] = useState(false);
  const hasRunRef = useRef(false);

  const logPeriod = useCallback(() => {
    if (isLogged || selectedDelegateIds.length === 0) return;
    const elapsed = initialSeconds - seconds;
    if (elapsed <= 0) return;
    setIsLogged(true);
    pause();
    onLog(selectedDelegateIds, eventType, elapsed);
  }, [eventType, initialSeconds, isLogged, onLog, pause, seconds, selectedDelegateIds]);

  useEffect(() => {
    if (
      seconds === 0 &&
      initialSeconds > 0 &&
      !isLogged &&
      hasRunRef.current
    ) {
      logPeriod();
    }
  }, [seconds, initialSeconds, isLogged, logPeriod]);

  const handleStart = () => {
    hasRunRef.current = true;
    start();
  };

  const handleReset = () => {
    setIsLogged(false);
    hasRunRef.current = false;
    reset(initialSeconds);
  };

  const needsDelegates = selectedDelegateIds.length === 0;

  return (
    <div className="space-y-3">
      <TimerCard
        label={label}
        seconds={seconds}
        running={running}
        onStart={handleStart}
        onPause={pause}
        onReset={handleReset}
        startDisabled={needsDelegates}
        startLabel="Start"
        hint={
          needsDelegates
            ? `Select author panel delegate(s) for ${phaseKind === "presentation" ? "presentation" : "Q&A"} before starting.`
            : `Logs ${eventType} speaking time for selected delegate(s) when the period ends.`
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={logPeriod}
          disabled={needsDelegates || isLogged || initialSeconds - seconds <= 0}
        >
          Complete &amp; Log {phaseKind === "presentation" ? "Presentation" : "Q&A"}
        </Button>
        {isLogged && (
          <span className="self-center text-sm text-green-700">
            Logged {formatTime(initialSeconds - seconds)} for{" "}
            {selectedDelegateIds.length} delegate(s)
          </span>
        )}
      </div>
    </div>
  );
}

function ReadingPhaseTimer({
  label,
  initialSeconds,
}: {
  label: string;
  initialSeconds: number;
}) {
  const { seconds, running, start, pause, reset } = useCountdown(initialSeconds);

  return (
    <TimerCard
      label={label}
      seconds={seconds}
      running={running}
      onStart={start}
      onPause={pause}
      onReset={() => reset(initialSeconds)}
      startLabel="Start"
    />
  );
}

export function PresentationSession({ motion, config }: PresentationSessionProps) {
  const { activeCommittee, addSpeakingEvent, setMotionPresentationDelegates } =
    useConference();
  const [activePhase, setActivePhase] = useState(0);

  const savedState = activeCommittee?.motionSessionState?.[motion.id];
  const [presentationDelegates, setPresentationDelegates] = useState<string[]>(
    savedState?.presentationDelegates ?? []
  );
  const [qaDelegates, setQaDelegates] = useState<string[]>(
    savedState?.qaDelegates ?? []
  );

  const phases = config.phases ?? [];

  const authorPanelDelegates = useMemo(() => {
    if (!activeCommittee) return [];
    const docIds = parseDocumentOrder(motion.details.presentation_order);
    const authorIds = new Set<string>();
    docIds.forEach((docId) => {
      const doc = activeCommittee.documents.find((d) => d.id === docId);
      doc?.authorPanel.forEach((id) => authorIds.add(id));
    });
    return activeCommittee.delegates.filter((d) => authorIds.has(d.id));
  }, [activeCommittee, motion.details.presentation_order]);

  const persistDelegates = (
    nextPresentation: string[],
    nextQa: string[]
  ) => {
    setPresentationDelegates(nextPresentation);
    setQaDelegates(nextQa);
    setMotionPresentationDelegates(motion.id, nextPresentation, nextQa);
  };

  const togglePresentation = (id: string) => {
    const next = presentationDelegates.includes(id)
      ? presentationDelegates.filter((x) => x !== id)
      : [...presentationDelegates, id];
    persistDelegates(next, qaDelegates);
  };

  const toggleQa = (id: string) => {
    const next = qaDelegates.includes(id)
      ? qaDelegates.filter((x) => x !== id)
      : [...qaDelegates, id];
    persistDelegates(presentationDelegates, next);
  };

  const logSpeaking = useCallback(
    (delegateIds: string[], eventType: string, durationSeconds: number) => {
      delegateIds.forEach((delegateId) => {
        addSpeakingEvent({
          delegateId,
          eventType,
          durationSeconds,
          notes: motion.type,
        });
      });
    },
    [addSpeakingEvent, motion.type]
  );

  if (!activeCommittee || phases.length === 0) return null;

  const phase = phases[activePhase];
  const isPresentation = phase.phaseKind === "presentation";
  const isQa = phase.phaseKind === "qa";

  return (
    <div className="space-y-3">
      {authorPanelDelegates.length === 0 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No author panel members found on the documents in the presentation
          order. Add author panel delegates on the Documents tab first.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {phases.map((p, i) => (
          <Button
            key={p.label}
            size="sm"
            variant={activePhase === i ? "primary" : "secondary"}
            onClick={() => setActivePhase(i)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {isPresentation && (
        <DelegateMultiSelect
          label="Presentation — Author Panel"
          delegates={authorPanelDelegates}
          selected={presentationDelegates}
          onToggle={togglePresentation}
          hint="Select delegate(s) presenting during this period."
        />
      )}

      {isQa && (
        <DelegateMultiSelect
          label="Q&A — Author Panel"
          delegates={authorPanelDelegates}
          selected={qaDelegates}
          onToggle={toggleQa}
          hint="Select delegate(s) answering questions during this period."
        />
      )}

      {isPresentation ? (
        <LoggedPhaseTimer
          key={`${motion.id}-presentation`}
          label={phase.label}
          initialSeconds={phase.seconds}
          phaseKind="presentation"
          selectedDelegateIds={presentationDelegates}
          eventType="presentation"
          onLog={logSpeaking}
        />
      ) : isQa ? (
        <LoggedPhaseTimer
          key={`${motion.id}-qa`}
          label={phase.label}
          initialSeconds={phase.seconds}
          phaseKind="qa"
          selectedDelegateIds={qaDelegates}
          eventType="qa"
          onLog={logSpeaking}
        />
      ) : (
        <ReadingPhaseTimer
          key={`${motion.id}-reading-${activePhase}`}
          label={phase.label}
          initialSeconds={phase.seconds}
        />
      )}
    </div>
  );
}
