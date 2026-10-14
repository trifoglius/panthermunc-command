"use client";

import { useMemo, useState } from "react";
import { useConference } from "@/context/ConferenceContext";
import { TimerCard } from "@/components/motions/TimerControls";
import { useCountdown } from "@/hooks/useCountdown";
import { ensureSessionState, speakingSeconds } from "@/lib/session-state";
import { addSpeakerWithReserve } from "@/lib/motion-timers";
import { Badge, Button, Card, Input, Select } from "@/components/ui";

export function SpeakersPanel() {
  const {
    activeCommittee,
    setAgendaAdopted,
    setSpeakingTime,
    setGeneralDebateQueue,
    archiveAndClearSpeakersList,
    setFloorAllotment,
    setCaucusSpeakerQueue,
    advanceCaucusSpeaker,
    setCaucusSpeakOrder,
    clearActiveCaucus,
    clearSuspension,
    addSpeakingEvent,
  } = useConference();

  const [addDelegateId, setAddDelegateId] = useState("");
  const [speakingInput, setSpeakingInput] = useState("");
  const [agendaTopicInput, setAgendaTopicInput] = useState("");
  const [caucusAddId, setCaucusAddId] = useState("");

  const session = useMemo(
    () =>
      activeCommittee
        ? ensureSessionState(activeCommittee.sessionState, activeCommittee.topic)
        : null,
    [activeCommittee]
  );

  const floor = session?.floorAllotment;
  const floorTimer = useCountdown(floor?.allottedSec ?? 0);
  const caucus = session?.activeCaucus;
  const caucusTotal = useCountdown(caucus?.totalSec ?? 0);
  const caucusSpeak = useCountdown(caucus?.speakingSec ?? 0);

  if (!activeCommittee || !session) return null;

  const queue = session.generalDebate.speakerQueue;
  const currentId = queue[session.generalDebate.currentIndex];
  const currentSeconds = speakingSeconds(session);
  const speakerHistory = activeCommittee.speakerListHistory ?? [];

  const country = (id: string) =>
    activeCommittee.delegates.find((d) => d.id === id)?.country ?? id;

  const addToQueue = () => {
    if (!addDelegateId) return;
    setGeneralDebateQueue([...queue, addDelegateId], session.generalDebate.currentIndex);
    setAddDelegateId("");
  };

  const removeFromQueue = (index: number) => {
    const next = queue.filter((_, i) => i !== index);
    let idx = session.generalDebate.currentIndex;
    if (index < idx) idx -= 1;
    else if (index === idx) idx = Math.min(idx, Math.max(0, next.length - 1));
    setGeneralDebateQueue(next, next.length === 0 ? 0 : idx);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= queue.length) return;
    const next = [...queue];
    [next[index], next[j]] = [next[j], next[index]];
    let current = session.generalDebate.currentIndex;
    if (current === index) current = j;
    else if (current === j) current = index;
    setGeneralDebateQueue(next, current);
  };

  const selectSpeaker = (index: number) => {
    setGeneralDebateQueue(queue, index);
    const delegateId = queue[index];
    if (!delegateId || floor?.kind !== "general_debate") return;
    const allottedSec = speakingSeconds(session);
    setFloorAllotment({
      kind: "general_debate",
      delegateId,
      allottedSec,
      startedAt: new Date().toISOString(),
    });
    floorTimer.reset(allottedSec);
  };

  const openFloor = () => {
    if (!currentId) return;
    setFloorAllotment({
      kind: "general_debate",
      delegateId: currentId,
      allottedSec: currentSeconds,
      startedAt: new Date().toISOString(),
    });
    floorTimer.reset(currentSeconds);
  };

  const finishCurrentSpeaker = () => {
    if (!currentId) return;
    const elapsed =
      floor && floor.delegateId === currentId
        ? Math.max(0, floor.allottedSec - floorTimer.seconds)
        : currentSeconds;
    addSpeakingEvent({
      delegateId: currentId,
      eventType: "general_debate",
      durationSeconds: elapsed || undefined,
    });
    setFloorAllotment(undefined);
    floorTimer.pause();
    const nextIndex = session.generalDebate.currentIndex + 1;
    setGeneralDebateQueue(queue, nextIndex);
  };

  const saveSpeakingTime = () => {
    const n = Number(speakingInput);
    if (Number.isFinite(n) && n > 0) {
      setSpeakingTime(n);
      if (floor?.kind === "general_debate") {
        setFloorAllotment({ ...floor, allottedSec: n });
        floorTimer.reset(n);
      }
    }
    setSpeakingInput("");
  };

  const adoptAgenda = () => {
    const topic =
      agendaTopicInput.trim() ||
      session.agenda.topic ||
      activeCommittee.topic ||
      "";
    if (!topic) return;
    setAgendaAdopted(true, topic);
    setAgendaTopicInput("");
  };

  const addToCaucus = () => {
    if (!caucus || !caucusAddId) return;
    const next = addSpeakerWithReserve(
      caucus.speakerQueue,
      caucusAddId,
      caucus.proposedBy,
      caucus.speakOrder,
      0
    );
    setCaucusSpeakerQueue(next);
    setCaucusAddId("");
  };

  return (
    <div className="space-y-4">
      <Card title="Agenda & speaking time">
        <div className="flex flex-wrap items-center gap-3">
          <Badge color={session.agenda.adopted ? "green" : "gray"}>
            {session.agenda.adopted ? "Agenda adopted" : "Agenda not adopted"}
          </Badge>
          {session.agenda.adopted && (
            <span className="text-sm text-purple-800">
              {session.agenda.topic || activeCommittee.topic || "No topic"}
            </span>
          )}
        </div>
        {!session.agenda.adopted ? (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Input
              label="Agenda item"
              value={agendaTopicInput}
              onChange={(e) => setAgendaTopicInput(e.target.value)}
              placeholder={
                session.agenda.topic ||
                activeCommittee.topic ||
                "Enter agenda item name"
              }
              className="min-w-[16rem] flex-1"
            />
            <Button
              size="sm"
              onClick={adoptAgenda}
              disabled={
                !(
                  agendaTopicInput.trim() ||
                  session.agenda.topic ||
                  activeCommittee.topic
                )
              }
            >
              Adopt agenda
            </Button>
          </div>
        ) : (
          <div className="mt-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAgendaAdopted(false)}
            >
              Mark not adopted
            </Button>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="rounded border border-purple-100 px-3 py-2 text-sm">
            <p className="text-purple-600">Speaking time</p>
            <p className="text-lg font-semibold text-purple-900">
              {session.speakingTime.speakingSec}s
            </p>
          </div>
          <Input
            label="Set speaking time (sec)"
            value={speakingInput}
            onChange={(e) => setSpeakingInput(e.target.value)}
            className="max-w-[10rem]"
          />
          <Button size="sm" onClick={saveSpeakingTime}>
            Update speaking time
          </Button>
        </div>
      </Card>

      {session.suspension?.active && (
        <Card title="Meeting suspended">
          <p className="mb-3 text-sm text-purple-700">
            Duration: {Math.round((session.suspension.durationSec || 0) / 60)} min
            {session.suspension.endsAt
              ? ` · ends ${new Date(session.suspension.endsAt).toLocaleTimeString()}`
              : ""}
          </p>
          <Button onClick={clearSuspension}>End suspension</Button>
        </Card>
      )}

      <Card title="General speakers list">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={archiveAndClearSpeakersList}
            disabled={queue.length === 0}
          >
            Clear &amp; archive list
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:items-start">
          <div className="space-y-3">
            {currentId ? (
              <>
                <div className="rounded border border-purple-100 p-3">
                  <p className="text-sm text-purple-600">Selected speaker</p>
                  <p className="text-lg font-semibold text-purple-900">
                    {country(currentId)} ({currentSeconds}s)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" onClick={openFloor}>
                      Start floor
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={finishCurrentSpeaker}
                    >
                      Log &amp; next
                    </Button>
                  </div>
                </div>
                {floor?.kind === "general_debate" ? (
                  <TimerCard
                    label={`Floor — ${country(floor.delegateId)}`}
                    seconds={floorTimer.seconds}
                    running={floorTimer.running}
                    onStart={floorTimer.start}
                    onPause={floorTimer.pause}
                    onReset={() => floorTimer.reset(floor.allottedSec)}
                    onClose={() => {
                      setFloorAllotment(undefined);
                      floorTimer.pause();
                    }}
                    startLabel={
                      floorTimer.seconds === floor.allottedSec
                        ? "Start"
                        : "Resume"
                    }
                    size="lg"
                  />
                ) : (
                  <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-purple-200 bg-purple-50/40 p-6 text-center text-sm text-purple-600">
                    Press Start floor to open the timer for the selected speaker.
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-purple-200 bg-purple-50/40 p-6 text-center text-sm text-purple-600">
                Add a speaker to open the floor timer.
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col gap-3 lg:border-l lg:border-purple-100 lg:pl-4">
            <div className="flex flex-wrap items-end gap-2">
              <Select
                label="Add speaker"
                value={addDelegateId}
                onChange={(e) => setAddDelegateId(e.target.value)}
                options={[
                  { value: "", label: "Select..." },
                  ...activeCommittee.delegates.map((d) => ({
                    value: d.id,
                    label: d.country,
                  })),
                ]}
                className="min-w-[12rem] flex-1"
              />
              <Button onClick={addToQueue} disabled={!addDelegateId}>
                Add
              </Button>
            </div>

            {queue.length === 0 ? (
              <p className="text-sm text-purple-600">No speakers on the list.</p>
            ) : (
              <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
                {queue.map((id, index) => {
                  const isSelected =
                    index === session.generalDebate.currentIndex;
                  const isSpeaking =
                    isSelected &&
                    floor?.kind === "general_debate" &&
                    floor.delegateId === id;
                  return (
                    <li
                      key={`${id}-${index}`}
                      className={`rounded border p-3 ${
                        isSelected
                          ? "border-purple-400 bg-purple-50 ring-1 ring-purple-300"
                          : "border-purple-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectSpeaker(index)}
                        className="flex w-full items-center gap-2 text-left"
                      >
                        <span className="w-6 shrink-0 text-sm text-purple-500">
                          {index + 1}.
                        </span>
                        <span className="font-medium text-purple-900">
                          {country(id)}
                        </span>
                        {isSpeaking ? (
                          <Badge color="purple">Speaking</Badge>
                        ) : isSelected ? (
                          <Badge color="purple">Selected</Badge>
                        ) : null}
                      </button>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => move(index, -1)}
                        >
                          Up
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => move(index, 1)}
                        >
                          Down
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromQueue(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {speakerHistory.length > 0 && (
        <Card title="Archived speakers lists">
          <ul className="space-y-3">
            {speakerHistory.map((snapshot) => (
              <li
                key={snapshot.id}
                className="rounded border border-purple-100 p-3 text-sm"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-purple-900">
                    {snapshot.label}
                  </span>
                  <span className="text-purple-500">
                    {new Date(snapshot.savedAt).toLocaleString()}
                  </span>
                  {snapshot.agendaTopic ? (
                    <Badge color="gray">{snapshot.agendaTopic}</Badge>
                  ) : null}
                  {snapshot.speakingSec != null ? (
                    <Badge color="purple">{snapshot.speakingSec}s</Badge>
                  ) : null}
                </div>
                <ol className="list-decimal pl-5 text-purple-800">
                  {snapshot.speakerQueue.map((id, i) => (
                    <li key={`${snapshot.id}-${id}-${i}`}>{country(id)}</li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {caucus && (
        <Card title={`Moderated caucus — ${caucus.topic || "Untitled"}`}>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge color="purple">
              {Math.round(caucus.totalSec / 60)} min total · {caucus.speakingSec}s
              speaking
            </Badge>
            <Button size="sm" variant="secondary" onClick={clearActiveCaucus}>
              End caucus
            </Button>
          </div>
          <div className="mb-3 max-w-xs">
            <Select
              label="Proposer speaks"
              value={caucus.speakOrder ?? "none"}
              onChange={(e) => {
                const value = e.target.value;
                setCaucusSpeakOrder(
                  value === "first" || value === "last" ? value : undefined
                );
              }}
              options={[
                { value: "none", label: "No reserve" },
                { value: "first", label: "First" },
                { value: "last", label: "Last" },
              ]}
            />
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <TimerCard
              label="Caucus total"
              seconds={caucusTotal.seconds}
              running={caucusTotal.running}
              onStart={caucusTotal.start}
              onPause={caucusTotal.pause}
              onReset={() => caucusTotal.reset(caucus.totalSec)}
              startLabel="Start"
            />
            <TimerCard
              label="Speaking"
              seconds={caucusSpeak.seconds}
              running={caucusSpeak.running}
              onStart={caucusSpeak.start}
              onPause={caucusSpeak.pause}
              onReset={() => caucusSpeak.reset(caucus.speakingSec)}
              onClose={() => caucusSpeak.reset(caucus.speakingSec)}
              startLabel="Start"
            />
          </div>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <Select
              label="Add to caucus list"
              value={caucusAddId}
              onChange={(e) => setCaucusAddId(e.target.value)}
              options={[
                { value: "", label: "Select..." },
                ...activeCommittee.delegates
                  .filter((d) => !caucus.speakerQueue.includes(d.id))
                  .map((d) => ({ value: d.id, label: d.country })),
              ]}
              className="min-w-[12rem]"
            />
            <Button onClick={addToCaucus} disabled={!caucusAddId}>
              Add
            </Button>
          </div>
          <ol className="space-y-1 text-sm">
            {caucus.speakerQueue.map((id, i) => (
              <li key={`${id}-${i}`} className="text-purple-900">
                {i + 1}. {country(id)}
                {id === caucus.proposedBy && caucus.speakOrder
                  ? ` (reserved ${caucus.speakOrder})`
                  : ""}
              </li>
            ))}
          </ol>
          {caucus.speakerQueue.length === 0 && (
            <p className="mt-2 text-sm text-purple-600">
              No speakers yet. Add delegates to the caucus list.
            </p>
          )}
          {caucus.speakerQueue[0] && (
            <div className="mt-3">
              <Button
                size="sm"
                onClick={() => {
                  const speaker = caucus.speakerQueue[0];
                  addSpeakingEvent({
                    delegateId: speaker,
                    eventType: "moderated_caucus",
                    durationSeconds: caucus.speakingSec,
                  });
                  advanceCaucusSpeaker();
                  caucusSpeak.reset(caucus.speakingSec);
                }}
              >
                Log speech &amp; advance ({country(caucus.speakerQueue[0])})
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
