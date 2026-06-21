"use client";

import { useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { type SessionTimers } from "@/hooks/useSessionTimers";
import {
  buildVotingSpeakerQueue,
  formatTime,
  parseVotingSpeakerOrder,
  type MotionTimerConfig,
} from "@/lib/motion-timers";
import type { Motion } from "@/lib/types";
import { isDelegatePresent } from "@/lib/rollcall";
import { Badge, Button, Select } from "@/components/ui";

interface VotingSpeakerQueueProps {
  motion: Motion;
  config: MotionTimerConfig;
  timers: SessionTimers;
}

export function VotingSpeakerQueue({
  motion,
  config,
  timers,
}: VotingSpeakerQueueProps) {
  const { activeCommittee, addSpeakingEvent, setMotionVotingSpeakers } =
    useConference();
  const savedState = activeCommittee?.motionSessionState?.[motion.id];
  const [speakersFor, setSpeakersFor] = useState<string[]>(
    savedState?.speakersFor ?? []
  );
  const [speakersAgainst, setSpeakersAgainst] = useState<string[]>(
    savedState?.speakersAgainst ?? []
  );
  const [addForId, setAddForId] = useState("");
  const [addAgainstId, setAddAgainstId] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const combinedQueue = buildVotingSpeakerQueue(
    speakersFor,
    speakersAgainst,
    config.votingSpeakerOrder ??
      parseVotingSpeakerOrder(motion.details.speaker_order)
  );

  const persistSpeakers = (nextFor: string[], nextAgainst: string[]) => {
    setSpeakersFor(nextFor);
    setSpeakersAgainst(nextAgainst);
    setMotionVotingSpeakers(motion.id, nextFor, nextAgainst);
  };

  if (!activeCommittee) return null;

  const usedIds = new Set([...speakersFor, ...speakersAgainst]);
  const available = activeCommittee.delegates.filter(
    (d) => !usedIds.has(d.id) && isDelegatePresent(activeCommittee, d.id)
  );
  const speakingSeconds = timers.speakingInitial;
  const currentSpeakerId = combinedQueue[currentIndex];
  const speakerSide = (id: string): "For" | "Against" =>
    speakersFor.includes(id) ? "For" : "Against";

  const addSpeaker = (side: "for" | "against", delegateId: string) => {
    if (!delegateId || usedIds.has(delegateId)) return;
    if (side === "for") {
      if (speakersFor.length >= 2) return;
      persistSpeakers([...speakersFor, delegateId], speakersAgainst);
      setAddForId("");
    } else {
      if (speakersAgainst.length >= 2) return;
      persistSpeakers(speakersFor, [...speakersAgainst, delegateId]);
      setAddAgainstId("");
    }
  };

  const removeSpeaker = (side: "for" | "against", delegateId: string) => {
    if (side === "for") {
      persistSpeakers(speakersFor.filter((id) => id !== delegateId), speakersAgainst);
    } else {
      persistSpeakers(speakersFor, speakersAgainst.filter((id) => id !== delegateId));
    }
  };

  const completeSpeech = () => {
    if (!currentSpeakerId) return;
    const elapsed = speakingSeconds - timers.speakingSeconds;
    addSpeakingEvent({
      delegateId: currentSpeakerId,
      eventType: config.speakingEventType,
      durationSeconds: elapsed > 0 ? elapsed : speakingSeconds,
      notes: `${motion.type} (${speakerSide(currentSpeakerId)})`,
    });
    timers.pause();
    if (currentIndex < combinedQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      timers.resetSpeaking();
    } else {
      setCurrentIndex(combinedQueue.length);
    }
  };

  const skipSpeaker = () => {
    timers.pause();
    if (currentIndex < combinedQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      timers.resetSpeaking();
    }
  };

  const currentSpeakerControls =
    currentSpeakerId && currentIndex < combinedQueue.length ? (
      <div className="mb-4 rounded-lg border border-purple-300 bg-white p-4">
        <p className="text-sm text-purple-700">
          Current:{" "}
          <strong>
            {
              activeCommittee.delegates.find((d) => d.id === currentSpeakerId)
                ?.country
            }
          </strong>{" "}
          ({speakerSide(currentSpeakerId)}) ·{" "}
          {formatTime(timers.speakingSeconds)} speaking remaining
          {timers.hasTotal && (
            <> · {formatTime(timers.totalSeconds)} period remaining</>
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
    ) : null;

  const renderSideList = (
    title: string,
    side: "for" | "against",
    speakers: string[],
    addId: string,
    setAddId: (id: string) => void,
    badgeColor: "green" | "red"
  ) => (
    <div className="rounded-lg border border-purple-100 p-3">
      <h5 className="mb-2 font-medium text-purple-900">{title}</h5>
      {speakers.length < 2 && (
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Select
            label={`Add ${title} Speaker`}
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
            options={[
              { value: "", label: "Select delegate..." },
              ...available.map((d) => ({ value: d.id, label: d.country })),
            ]}
            className="min-w-48"
          />
          <Button onClick={() => addSpeaker(side, addId)} disabled={!addId}>
            Add
          </Button>
        </div>
      )}
      {speakers.length === 0 ? (
        <p className="text-sm text-purple-600">No speakers added yet.</p>
      ) : (
        <ol className="space-y-2">
          {speakers.map((id, i) => {
            const delegate = activeCommittee.delegates.find((d) => d.id === id);
            const queueIndex = combinedQueue.indexOf(id);
            const isCurrent = queueIndex === currentIndex;
            const isDone = queueIndex >= 0 && queueIndex < currentIndex;
            return (
              <li
                key={`${side}-${id}`}
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
                {!isDone && !isCurrent && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSpeaker(side, id)}
                  >
                    Remove
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-2">
        <Badge color={badgeColor}>{speakers.length}/2</Badge>
      </div>
    </div>
  );

  return (
    <div className="mt-4 border-t border-purple-100 pt-4">
      <h4 className="mb-1 font-semibold text-purple-900">
        2-for-2-against Speakers
      </h4>
      <p className="mb-3 text-sm text-purple-600">
        Add two speakers for and two against. Speaking order alternates (
        {config.votingSpeakerOrder === "against_first" ||
        parseVotingSpeakerOrder(motion.details.speaker_order) === "against_first"
          ? "against, for, against, for"
          : "for, against, for, against"}
        ). Total time is four times the individual speaking time.
      </p>

      {timers.hasTotal && (
        <p className="mb-3 text-sm text-purple-600">
          Period remaining: {formatTime(timers.totalSeconds)}
        </p>
      )}

      {currentSpeakerControls}

      <div className="grid gap-4 md:grid-cols-2">
        {renderSideList("Speakers For", "for", speakersFor, addForId, setAddForId, "green")}
        {renderSideList("Speakers Against", "against", speakersAgainst, addAgainstId, setAddAgainstId, "red")}
      </div>
    </div>
  );
}
