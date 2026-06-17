"use client";

import { useState } from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { type SessionTimers } from "@/hooks/useSessionTimers";
import { formatTime, type MotionTimerConfig } from "@/lib/motion-timers";
import { Button } from "@/components/ui";
import type { Motion } from "@/lib/types";

// ---------------------------------------------------------------------------
// TimerCard — single countdown display with start/pause/reset controls
// ---------------------------------------------------------------------------

export function TimerCard({
  label,
  seconds,
  running,
  onStart,
  onPause,
  onReset,
  startDisabled,
  startLabel,
  hint,
}: {
  label: string;
  seconds: number;
  running: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  startDisabled?: boolean;
  startLabel: string;
  hint?: string;
}) {
  const isLow = seconds > 0 && seconds <= 10;
  const isDone = seconds === 0;

  return (
    <div
      className={`rounded-lg border p-4 text-center ${
        isDone
          ? "border-red-300 bg-red-50"
          : isLow
            ? "border-yellow-300 bg-yellow-50"
            : "border-purple-200 bg-purple-50"
      }`}
    >
      <p className="text-sm font-medium text-purple-800">{label}</p>
      <p
        className={`mt-1 text-4xl font-bold tabular-nums ${
          isDone ? "text-red-700" : "text-purple-900"
        }`}
      >
        {formatTime(seconds)}
      </p>
      {hint && <p className="mt-1 text-xs text-purple-600">{hint}</p>}
      <div className="mt-3 flex justify-center gap-2">
        {!running ? (
          <Button size="sm" onClick={onStart} disabled={startDisabled}>
            {startLabel}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onPause}>
            Pause
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhaseTimer — wraps a single-phase countdown (e.g. UN caucus phases)
// ---------------------------------------------------------------------------

export function PhaseTimer({
  label,
  initialSeconds,
}: {
  label: string;
  initialSeconds: number;
}) {
  const { seconds, running, start, pause, reset } =
    useCountdown(initialSeconds);

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

// ---------------------------------------------------------------------------
// TimerDisplay — selects between phase-based and dual-timer layouts
// ---------------------------------------------------------------------------

export function TimerDisplay({
  config,
  motion,
  timers,
}: {
  config: MotionTimerConfig;
  motion: Motion;
  timers: SessionTimers;
}) {
  const [activePhase, setActivePhase] = useState(0);

  if (config.phases && config.phases.length > 0) {
    const phase = config.phases[activePhase];
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {config.phases.map((p, i) => (
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
        <PhaseTimer
          key={`${motion.id}-phase-${activePhase}`}
          label={phase.label}
          initialSeconds={phase.seconds}
        />
      </div>
    );
  }

  const { hasTotal, hasSpeaking } = timers;
  if (!hasTotal && !hasSpeaking) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {hasTotal && (
        <TimerCard
          label="Total Time"
          seconds={timers.totalSeconds}
          running={timers.mode === "total" || timers.mode === "speaking"}
          onStart={timers.startTotal}
          onPause={timers.pause}
          onReset={() => timers.resetTotal()}
          startDisabled={timers.totalSeconds === 0}
          startLabel="Start Total"
        />
      )}
      {hasSpeaking && (
        <TimerCard
          label="Speaking Time"
          seconds={timers.speakingSeconds}
          running={timers.mode === "speaking"}
          onStart={timers.startSpeaking}
          onPause={timers.pause}
          onReset={() => timers.resetSpeaking()}
          startDisabled={timers.speakingSeconds === 0}
          startLabel="Start Speaking"
          hint={
            hasTotal ? "Speaking time depletes total time." : undefined
          }
        />
      )}
    </div>
  );
}
