import { beforeEach, describe, expect, it, vi } from "vitest";

const { batchGetSpy } = vi.hoisted(() => ({
  batchGetSpy: vi.fn(),
}));

vi.mock("@/shared/api/userDataRepository", () => ({
  userDataRepository: {
    batchGet: batchGetSpy,
  },
}));

import { loadKey, __resetBatchLoaderForTests } from "@/shared/api/cloudBatchLoader";

describe("cloudBatchLoader", () => {
  beforeEach(() => {
    __resetBatchLoaderForTests();
    batchGetSpy.mockReset();
  });

  it("coalesces multiple parallel reads into a single batchGet", async () => {
    batchGetSpy.mockResolvedValue({ a: 1, b: 2, c: 3 });

    const [va, vb, vc] = await Promise.all([
      loadKey<number>("a"),
      loadKey<number>("b"),
      loadKey<number>("c"),
    ]);

    expect(va).toBe(1);
    expect(vb).toBe(2);
    expect(vc).toBe(3);
    expect(batchGetSpy).toHaveBeenCalledTimes(1);
    expect(batchGetSpy.mock.calls[0][0].sort()).toEqual(["a", "b", "c"]);
  });

  it("dedupes multiple calls for the same key in the same tick", async () => {
    batchGetSpy.mockResolvedValue({ x: 42 });

    const [v1, v2, v3] = await Promise.all([
      loadKey<number>("x"),
      loadKey<number>("x"),
      loadKey<number>("x"),
    ]);

    expect(v1).toBe(42);
    expect(v2).toBe(42);
    expect(v3).toBe(42);
    expect(batchGetSpy).toHaveBeenCalledTimes(1);
    expect(batchGetSpy.mock.calls[0][0]).toEqual(["x"]);
  });

  it("resolves null for keys absent from the batch result", async () => {
    batchGetSpy.mockResolvedValue({ a: 1 }); // 'b' absent

    const [va, vb] = await Promise.all([loadKey("a"), loadKey("b")]);

    expect(va).toBe(1);
    expect(vb).toBeNull();
  });

  it("resolves null for every key when batchGet throws", async () => {
    batchGetSpy.mockRejectedValue(new Error("network down"));

    const [va, vb, vc] = await Promise.all([
      loadKey("a"),
      loadKey("b"),
      loadKey("c"),
    ]);

    expect(va).toBeNull();
    expect(vb).toBeNull();
    expect(vc).toBeNull();
    expect(batchGetSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT keep a durable cache — a second call to the same key hits the network again", async () => {
    batchGetSpy.mockResolvedValueOnce({ a: 1 });
    const v1 = await loadKey<number>("a");
    expect(v1).toBe(1);

    batchGetSpy.mockResolvedValueOnce({ a: 2 });
    const v2 = await loadKey<number>("a");
    expect(v2).toBe(2);

    expect(batchGetSpy).toHaveBeenCalledTimes(2);
  });

  it("starts a fresh batch for calls arriving while a previous batch is in flight", async () => {
    // First batch — pending until we resolve it manually
    let resolveFirst: (value: Record<string, unknown>) => void = () => {};
    batchGetSpy.mockReturnValueOnce(
      new Promise<Record<string, unknown>>((resolve) => {
        resolveFirst = resolve;
      }),
    );

    const p1 = loadKey<number>("a");

    // Let the queued microtask run so flushBatch enters its await(batchGet).
    // At this point, pendingResolvers has been reset and batchScheduled = false.
    await Promise.resolve();
    await Promise.resolve();

    // Second batch — should be scheduled independently
    batchGetSpy.mockResolvedValueOnce({ b: 20 });
    const p2 = loadKey<number>("b");

    // Resolve the first batch
    resolveFirst({ a: 10 });

    const [va, vb] = await Promise.all([p1, p2]);

    expect(va).toBe(10);
    expect(vb).toBe(20);
    expect(batchGetSpy).toHaveBeenCalledTimes(2);
    expect(batchGetSpy.mock.calls[0][0]).toEqual(["a"]);
    expect(batchGetSpy.mock.calls[1][0]).toEqual(["b"]);
  });

  it("handles typed payloads transparently (returns whatever batchGet stored)", async () => {
    const obj = { nested: ["x", "y"], count: 3 };
    batchGetSpy.mockResolvedValue({ "complex-key": obj });

    const value = await loadKey<typeof obj>("complex-key");
    expect(value).toEqual(obj);
  });
});
