"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { useSessionTimers } from "@/hooks/useSessionTimers";
import { useCountdown } from "@/hooks/useCountdown";
import {
  formatTime,
  getTimerConfig,
  type MotionTimerConfig,
} from "@/lib/motion-timers";
import type { Motion } from "@/lib/types";
import { Badge, Button, Card, Select } from "@/components/ui";

interface MotionActiveSessionProps {
  motion: Motion;
  onDismiss: () => void;
}

export function MotionActiveSession({
  motion,
  onDismiss,
}: MotionActiveSessionProps) {
  const config = getTimerConfig(motion);
  if (!config) return null;

  const timers = useSessionTimers(
    config.totalSeconds ?? 0,
    config.speakingSeconds ?? 0
  );

  return (
    <Card title={`Active: ${motion.type}`} className="border-2 border-purple-400">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Badge color="green">Passed</Badge>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
      <TimerDisplay config={config} motion={motion} timers={timers} />
      {config.hasSpeakerQueue && (
        <SpeakerQueue
          motion={motion}
          config={config}
          timers={timers}
        />
      )}
    </Card>
  );
}

type SessionTimers = ReturnType<typeof useSessionTimers>;

function TimerDisplay({
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

  const hasTotal = timers.hasTotal;
  const hasSpeaking = timers.hasSpeaking;

  if (!hasTotal && !hasSpeaking) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {hasTotal && (
        <TimerCard
          label="Total Time"
          seconds={timers.totalSeconds}
          initialSeconds={timers.totalInitial}
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
          initialSeconds={timers.speakingInitial}
          running={timers.mode === "speaking"}
          onStart={timers.startSpeaking}
          onPause={timers.pause}
          onReset={() => timers.resetSpeaking()}
          startDisabled={timers.speakingSeconds === 0}
          startLabel="Start Speaking"
          hint={
            hasTotal
              ? "Speaking time also depletes total time."
              : undefined
          }
        />
      )}
    </div>
  );
}

function TimerCard({
  label,
  seconds,
  initialSeconds,
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
  initialSeconds: number;
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
      {hint && (
        <p className="mt-1 text-xs text-purple-600">{hint}</p>
      )}
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

function PhaseTimer({
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
      initialSeconds={initialSeconds}
      running={running}
      onStart={start}
      onPause={pause}
      onReset={() => reset(initialSeconds)}
      startLabel="Start"
    />
  );
}

function SpeakerQueue({
  motion,
  config,
  timers,
}: {
  motion: Motion;
  config: MotionTimerConfig;
  timers: SessionTimers;
}) {
  const { activeCommittee, addSpeakingEvent, setMotionSpeakerQueue } =
    useConference();
  const savedQueue =
    activeCommittee?.motionSessionState?.[motion.id]?.speakerQueue ?? [];
  const [queue, setQueue] = useState<string[]>(savedQueue);
  const [addId, setAddId] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const updateQueue = (next: string[]) => {
    setQueue(next);
    setMotionSpeakerQueue(motion.id, next);
  };

  if (!activeCommittee) return null;

  const speakingSeconds = timers.speakingInitial;
  const available = activeCommittee.delegates.filter(
    (d) => !queue.includes(d.id)
  );
  const currentSpeakerId = queue[currentIndex];

  const addSpeaker = () => {
    if (!addId || queue.includes(addId)) return;
    updateQueue([...queue, addId]);
    setAddId("");
  };

  const completeSpeech = () => {
    if (!currentSpeakerId) return;
    const elapsed = speakingSeconds - timers.speakingSeconds;
    addSpeakingEvent({
      delegateId: currentSpeakerId,
      eventType: config.speakingEventType,
      durationSeconds: elapsed > 0 ? elapsed : speakingSeconds,
      notes: motion.type,
    });
    timers.pause();
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      timers.resetSpeaking();
    } else {
      setCurrentIndex(queue.length);
    }
  };

  const skipSpeaker = () => {
    timers.pause();
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      timers.resetSpeaking();
    }
  };

  return (
    <div className="mt-4 border-t border-purple-100 pt-4">
      <h4 className="mb-3 font-semibold text-purple-900">Speaker List</h4>

      {timers.hasTotal && (
        <p className="mb-3 text-sm text-purple-600">
          Caucus total remaining: {formatTime(timers.totalSeconds)}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Select
          label="Add Speaker"
          value={addId}
          onChange={(e) => setAddId(e.target.value)}
          options={[
            { value: "", label: "Select delegate..." },
            ...available.map((d) => ({ value: d.id, label: d.country })),
          ]}
          className="min-w-48"
        />
        <Button onClick={addSpeaker} disabled={!addId}>
          Add to List
        </Button>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm text-purple-600">
          Add speakers to the list. Speeches are logged automatically when
          marked complete.
        </p>
      ) : (
        <ol className="space-y-2">
          {queue.map((id, i) => {
            const delegate = activeCommittee.delegates.find((d) => d.id === id);
            const isCurrent = i === currentIndex;
            const isDone = i < currentIndex;
            return (
              <li
                key={`${id}-${i}`}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  isCurrent
                    ? "border-purple-500 bg-purple-100"
                    : isDone
                      ? "border-gray-200 bg-gray-50 opacity-60"
                      : "border-purple-100"
                }`}
              >
                <span className="text-sm">
                  <span className="mr-2 font-medium text-purple-600">
                    {i + 1}.
                  </span>
                  {delegate?.country ?? "Unknown"}
                  {isCurrent && <Badge color="purple">Speaking</Badge>}
                  {isDone && <Badge color="gray">Logged</Badge>}
                </span>
                {!isDone && i > currentIndex && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateQueue(queue.filter((_, idx) => idx !== i))
                    }
                  >
                    Remove
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {currentSpeakerId && currentIndex < queue.length && (
        <div className="mt-4 rounded-lg border border-purple-300 bg-white p-4">
          <p className="text-sm text-purple-700">
            Current:{" "}
            <strong>
              {
                activeCommittee.delegates.find((d) => d.id === currentSpeakerId)
                  ?.country
              }
            </strong>{" "}
            · {formatTime(timers.speakingSeconds)} speaking remaining
            {timers.hasTotal && (
              <> · {formatTime(timers.totalSeconds)} caucus remaining</>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {timers.mode !== "speaking" ? (
              <Button size="sm" onClick={timers.startSpeaking}>
                Start Speaking Timer
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={timers.pause}>
                Pause
              </Button>
            )}
            <Button size="sm" onClick={completeSpeech}>
              Complete &amp; Log Speech
            </Button>
            <Button size="sm" variant="ghost" onClick={skipSpeaker}>
              Skip
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                timers.pause();
                timers.resetSpeaking();
              }}
            >
              Reset Speaking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
