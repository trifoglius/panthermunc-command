/**
 * Per-key async serializer with coalescing.
 *
 * While a task for a given key is running, further requests for that key set a
 * pending flag instead of starting a second task; when the running task
 * finishes, a single follow-up run drains the coalesced work. This serializes
 * committee saves so overlapping edits from one client never race each other
 * into version conflicts.
 */
export function createSaveQueue<K>() {
  const inFlight = new Set<K>();
  const pending = new Set<K>();

  async function run(key: K, task: () => Promise<void>): Promise<void> {
    if (inFlight.has(key)) {
      pending.add(key);
      return;
    }
    inFlight.add(key);
    try {
      do {
        pending.delete(key);
        await task();
      } while (pending.has(key));
    } finally {
      inFlight.delete(key);
    }
  }

  return {
    run,
    isInFlight: (key: K) => inFlight.has(key),
  };
}

export type SaveQueue<K> = ReturnType<typeof createSaveQueue<K>>;
