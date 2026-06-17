"use client";

import { useSessionTimers } from "@/hooks/useSessionTimers";
import { VotingPapersPanel } from "@/components/motions/VotingPapersPanel";
import { TimerDisplay } from "@/components/motions/TimerControls";
import { SpeakerQueue } from "@/components/motions/SpeakerQueue";
import { VotingSpeakerQueue } from "@/components/motions/VotingSpeakerQueue";
import { getMotionTypeId, getTimerConfig, type MotionTimerConfig } from "@/lib/motion-timers";
import type { Motion } from "@/lib/types";
import { Badge, Button, Card } from "@/components/ui";

interface MotionActiveSessionProps {
  motion: Motion;
  onDismiss: () => void;
}

export function MotionActiveSession({
  motion,
  onDismiss,
}: MotionActiveSessionProps) {
  const config = getTimerConfig(motion);
  const isVotingProcedure = getMotionTypeId(motion) === "enter_voting";

  if (!config && !isVotingProcedure) return null;

  return (
    <Card title={`Active: ${motion.type}`} className="border-2 border-purple-400">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Badge color="green">Passed</Badge>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
      {config && <MotionActiveSessionBody motion={motion} config={config} />}
      {isVotingProcedure && <VotingPapersPanel motion={motion} />}
    </Card>
  );
}

function MotionActiveSessionBody({
  motion,
  config,
}: {
  motion: Motion;
  config: MotionTimerConfig;
}) {
  const timers = useSessionTimers(
    config.totalSeconds ?? 0,
    config.speakingSeconds ?? 0
  );

  return (
    <>
      <TimerDisplay config={config} motion={motion} timers={timers} />
      {config.hasSpeakerQueue &&
        (config.queueMode === "for_against" ? (
          <VotingSpeakerQueue motion={motion} config={config} timers={timers} />
        ) : (
          <SpeakerQueue motion={motion} config={config} timers={timers} />
        ))}
    </>
  );
}
