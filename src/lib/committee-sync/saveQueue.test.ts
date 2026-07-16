import { describe, expect, it } from "vitest";
import { createSaveQueue } from "./saveQueue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("createSaveQueue", () => {
  it("serializes tasks for the same key (no overlapping runs)", async () => {
    const queue = createSaveQueue<string>();
    let concurrent = 0;
    let maxConcurrent = 0;
    const gate = deferred();

    const task = async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await gate.promise;
      concurrent -= 1;
    };

    const first = queue.run("c1", task);
    expect(queue.isInFlight("c1")).toBe(true);
    // Second call while first is in flight should coalesce, not run in parallel.
    const second = queue.run("c1", task);
    gate.resolve();
    await Promise.all([first, second]);

    expect(maxConcurrent).toBe(1);
  });

  it("coalesces multiple pending requests into a single follow-up run", async () => {
    const queue = createSaveQueue<string>();
    let runs = 0;
    const gate = deferred();

    const task = async () => {
      runs += 1;
      if (runs === 1) await gate.promise; // hold the first run open
    };

    const first = queue.run("c1", task);
    // Three more while the first is in flight — should collapse to ONE follow-up.
    void queue.run("c1", task);
    void queue.run("c1", task);
    void queue.run("c1", task);
    gate.resolve();
    await first;
    // Allow the coalesced follow-up to drain.
    await queue.run("c1", async () => {});

    // 1 initial + 1 coalesced follow-up (+ the awaited drain no-op counts as its
    // own run only if nothing pending). runs should be exactly 2 from the task.
    expect(runs).toBe(2);
  });

  it("runs different keys independently", async () => {
    const queue = createSaveQueue<string>();
    const order: string[] = [];
    await Promise.all([
      queue.run("a", async () => {
        order.push("a");
      }),
      queue.run("b", async () => {
        order.push("b");
      }),
    ]);
    expect(order.sort()).toEqual(["a", "b"]);
  });
});
