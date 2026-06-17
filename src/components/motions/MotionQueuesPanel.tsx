"use client";

import { useConference } from "@/context/ConferenceContext";
import { Badge, Card } from "@/components/ui";
import type { Motion, MotionStatus } from "@/lib/types";

export function MotionQueuesPanel() {
  const { activeCommittee } = useConference();

  if (!activeCommittee) return null;

  const history = activeCommittee.motionQueueHistory ?? [];

  if (history.length === 0) {
    return (
      <Card title="Motion Queues">
        <p className="text-sm text-purple-600">
          No archived motion queues yet. When a motion passes on the Motions tab,
          use &quot;Archive Queue &amp; Clear&quot; to save the queue here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Motion Queues">
        <p className="text-sm text-purple-700">
          Past motion queues are grouped below, newest first. Speaker lists are
          saved for formal speaking motions (speakers list, moderated caucus,
          round robin, and 2-for-2-against). Presentation and Q&amp;A delegate
          selections are saved for draft resolution presentation motions.
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
    </div>
  );
}

function SnapshotCard({
  snapshot,
  committee,
}: {
  snapshot: NonNullable<
    NonNullable<ReturnType<typeof useConference>["activeCommittee"]>["motionQueueHistory"]
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
    (a, b) => b.disruptivity - a.disruptivity
  );

  return (
    <Card title={snapshot.label}>
      <p className="mb-4 text-sm text-purple-600">
        Archived {new Date(snapshot.savedAt).toLocaleString()}
      </p>

      {snapshot.passedMotion && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-900">Passed Motion</p>
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
                  Speakers For
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
                  Speakers Against
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

      {(snapshot.presentationDelegates?.length ?? 0) > 0 ||
      (snapshot.qaDelegates?.length ?? 0) > 0 ? (
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          {(snapshot.presentationDelegates?.length ?? 0) > 0 && (
            <div className="rounded-md border border-purple-200 bg-purple-50 p-3">
              <p className="mb-2 text-sm font-medium text-purple-900">
                Presentation — Author Panel
              </p>
              <p className="text-sm text-purple-800">
                {snapshot.presentationDelegates!.map(countryName).join(", ")}
              </p>
            </div>
          )}
          {(snapshot.qaDelegates?.length ?? 0) > 0 && (
            <div className="rounded-md border border-purple-200 bg-purple-50 p-3">
              <p className="mb-2 text-sm font-medium text-purple-900">
                Q&amp;A — Author Panel
              </p>
              <p className="text-sm text-purple-800">
                {snapshot.qaDelegates!.map(countryName).join(", ")}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {snapshot.speakerQueue && snapshot.speakerQueue.length > 0 && (
        <div className="mb-4 rounded-md border border-purple-200 bg-purple-50 p-3">
          <p className="mb-2 text-sm font-medium text-purple-900">
            Speaker List
          </p>
          <ol className="list-decimal pl-5 text-sm text-purple-800">
            {snapshot.speakerQueue.map((id, i) => (
              <li key={`${id}-${i}`}>{countryName(id)}</li>
            ))}
          </ol>
        </div>
      )}

      <p className="mb-2 text-sm font-medium text-purple-900">Queue Contents</p>
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
            {proposer} · Disruptivity: {motion.disruptivity}
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
