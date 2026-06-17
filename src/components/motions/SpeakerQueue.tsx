"use client";

import { useEffect, useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { type SessionTimers } from "@/hooks/useSessionTimers";
import {
  addSpeakerWithReserve,
  applySpeakOrderReserve,
  formatTime,
  type MotionTimerConfig,
} from "@/lib/motion-timers";
import type { Motion } from "@/lib/types";
import { isDelegatePresent } from "@/lib/rollcall";
import { Badge, Button, Select } from "@/components/ui";

interface SpeakerQueueProps {
  motion: Motion;
  config: MotionTimerConfig;
  timers: SessionTimers;
}

export function SpeakerQueue({ motion, config, timers }: SpeakerQueueProps) {
  const { activeCommittee, addSpeakingEvent, setMotionSpeakerQueue } =
    useConference();
  const savedQueue =
    activeCommittee?.motionSessionState?.[motion.id]?.speakerQueue ?? [];
  const initialQueue =
    savedQueue.length > 0
      ? savedQueue
      : applySpeakOrderReserve([], motion.proposedBy, motion.details.speak_order);
  const [queue, setQueue] = useState<string[]>(initialQueue);
  const [addId, setAddId] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const updateQueue = (next: string[]) => {
    setQueue(next);
    setMotionSpeakerQueue(motion.id, next);
  };

  useEffect(() => {
    if (savedQueue.length > 0 || initialQueue.length === 0) return;
    setMotionSpeakerQueue(motion.id, initialQueue);
  }, [initialQueue, motion.id, savedQueue.length, setMotionSpeakerQueue]);

  if (!activeCommittee) return null;

  const speakingSeconds = timers.speakingInitial;
  const pendingIds = queue.slice(currentIndex);
  const available = activeCommittee.delegates.filter(
    (d) => !pendingIds.includes(d.id) && isDelegatePresent(activeCommittee, d.id)
  );
  const currentSpeakerId = queue[currentIndex];

  const addSpeaker = () => {
    if (!addId || pendingIds.includes(addId)) return;
    updateQueue(
      addSpeakerWithReserve(
        queue,
        addId,
        motion.proposedBy,
        motion.details.speak_order,
        currentIndex
      )
    );
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
          Add speakers to the list. Speeches are logged automatically when marked
          complete.
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
                      updateQueue(
                        applySpeakOrderReserve(
                          queue.filter((_, idx) => idx !== i),
                          motion.proposedBy,
                          motion.details.speak_order,
                          currentIndex
                        )
                      )
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
              {activeCommittee.delegates.find((d) => d.id === currentSpeakerId)?.country}
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
