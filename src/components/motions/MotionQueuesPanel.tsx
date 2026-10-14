"use client";

import { useConference } from "@/context/ConferenceContext";
import { Badge, Card } from "@/components/ui";
import type { Motion, MotionStatus } from "@/lib/types";

export function MotionQueuesPanel() {
  const { activeCommittee } = useConference();

  if (!activeCommittee) return null;

  const history = activeCommittee.motionQueueHistory ?? [];
  const session = activeCommittee.sessionState;

  return (
    <div className="space-y-6">
      <Card title="Session snapshot">
        <dl className="grid gap-2 text-sm text-purple-800 sm:grid-cols-2">
          <div>
            <dt className="text-purple-500">Agenda</dt>
            <dd>
              {session?.agenda.topic || activeCommittee.topic || "—"}
              {session?.agenda.adopted ? " (adopted)" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-purple-500">Speaking time</dt>
            <dd>{session?.speakingTime.speakingSec ?? "—"}s</dd>
          </div>
          <div>
            <dt className="text-purple-500">Speakers on list</dt>
            <dd>{session?.generalDebate.speakerQueue.length ?? 0}</dd>
          </div>
          <div>
            <dt className="text-purple-500">Active vote</dt>
            <dd>
              {session?.voteContext
                ? `${session.voteContext.target.type} · ${
                    session.voteContext.mode === "consensus"
                      ? "consensus"
                      : "recorded"
                  }`
                : "None"}
            </dd>
          </div>
        </dl>
      </Card>

      {history.length === 0 ? (
        <Card title="Motion history">
          <p className="text-sm text-purple-600">
            No archived motion logs yet. After a motion passes, use &quot;Archive
            log after this motion&quot; on the Motions tab.
          </p>
        </Card>
      ) : (
        <>
          <Card title="Motion history">
            <p className="text-sm text-purple-700">
              Archived motion logs, newest first. Speaker lists are saved for
              moderated caucuses; for/against lists are saved for division and
              competence motions (debated before the motion vote).
            </p>
          </Card>

          {history.map((snapshot, index) => (
            <div key={snapshot.id}>
              {index > 0 && (
                <hr className="mb-6 border-t-2 border-purple-200" />
              )}
              <SnapshotCard snapshot={snapshot} committee={activeCommittee} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function SnapshotCard({
  snapshot,
  committee,
}: {
  snapshot: NonNullable<
    NonNullable<
      ReturnType<typeof useConference>["activeCommittee"]
    >["motionQueueHistory"]
  >[number];
  committee: NonNullable<ReturnType<typeof useConference>["activeCommittee"]>;
}) {
  const countryName = (id: string) =>
    committee.delegates.find((d) => d.id === id)?.country ?? "Unknown";

  const statusColors: Record<MotionStatus, "yellow" | "green" | "red" | "gray"> =
    {
      pending: "yellow",
      passed: "green",
      failed: "red",
      withdrawn: "gray",
    };

  const sortedMotions = [...snapshot.motions].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <Card title={snapshot.label}>
      <p className="mb-4 text-sm text-purple-600">
        Archived {new Date(snapshot.savedAt).toLocaleString()}
      </p>

      {snapshot.passedMotion && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-900">Passed motion</p>
          <p className="text-sm text-green-800">{snapshot.passedMotion.type}</p>
        </div>
      )}

      {snapshot.votingSpeakers &&
        (snapshot.votingSpeakers.for.length > 0 ||
          snapshot.votingSpeakers.against.length > 0) && (
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            {snapshot.votingSpeakers.for.length > 0 && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3">
                <p className="mb-2 text-sm font-medium text-green-900">
                  Speakers for
                </p>
                <ol className="list-decimal pl-5 text-sm text-green-800">
                  {snapshot.votingSpeakers.for.map((id, i) => (
                    <li key={`for-${id}-${i}`}>{countryName(id)}</li>
                  ))}
                </ol>
              </div>
            )}
            {snapshot.votingSpeakers.against.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="mb-2 text-sm font-medium text-red-900">
                  Speakers against
                </p>
                <ol className="list-decimal pl-5 text-sm text-red-800">
                  {snapshot.votingSpeakers.against.map((id, i) => (
                    <li key={`against-${id}-${i}`}>{countryName(id)}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

      {snapshot.speakerQueue && snapshot.speakerQueue.length > 0 && (
        <div className="mb-4 rounded-md border border-purple-200 bg-purple-50 p-3">
          <p className="mb-2 text-sm font-medium text-purple-900">
            Speaker list
          </p>
          <ol className="list-decimal pl-5 text-sm text-purple-800">
            {snapshot.speakerQueue.map((id, i) => (
              <li key={`${id}-${i}`}>{countryName(id)}</li>
            ))}
          </ol>
        </div>
      )}

      <p className="mb-2 text-sm font-medium text-purple-900">Motions</p>
      <div className="space-y-2">
        {sortedMotions.map((motion) => (
          <ArchivedMotionRow
            key={motion.id}
            motion={motion}
            proposer={countryName(motion.proposedBy)}
            statusColor={statusColors[motion.status]}
          />
        ))}
      </div>
    </Card>
  );
}

function ArchivedMotionRow({
  motion,
  proposer,
  statusColor,
}: {
  motion: Motion;
  proposer: string;
  statusColor: "yellow" | "green" | "red" | "gray";
}) {
  return (
    <div className="rounded-md border border-purple-100 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-purple-900">{motion.type}</p>
          <p className="text-sm text-purple-600">
            {proposer} · {new Date(motion.timestamp).toLocaleString()}
          </p>
          {Object.entries(motion.details).map(([k, v]) =>
            v ? (
              <p key={k} className="text-sm text-purple-700">
                {k.replace(/_/g, " ")}: {v}
              </p>
            ) : null
          )}
        </div>
        <Badge color={statusColor}>{motion.status}</Badge>
      </div>
    </div>
  );
}
