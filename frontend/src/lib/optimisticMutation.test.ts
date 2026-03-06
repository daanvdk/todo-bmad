import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeOptimisticHandlers } from "./optimisticMutation";

interface Item {
  id: number;
  text: string;
}

const QUERY_KEY = ["/api/test"];
const getQueryKey = () => QUERY_KEY;
const seed: Item[] = [
  { id: 1, text: "first" },
  { id: 2, text: "second" },
];

describe("makeOptimisticHandlers", () => {
  let qc: QueryClient;
  const handleError = vi.fn<() => void>();

  beforeEach(() => {
    qc = new QueryClient();
    qc.setQueryData(QUERY_KEY, { data: seed });
    handleError.mockClear();
  });

  function buildHandlers<TVars>(
    updater: (items: Item[], vars: TVars) => Item[],
  ) {
    return makeOptimisticHandlers<Item, TVars>(
      qc,
      getQueryKey,
      updater,
      handleError,
    );
  }

  describe("onMutate", () => {
    it("applies optimistic update to the cache", async () => {
      const handlers = buildHandlers<{ id: number }>((items, { id }) =>
        items.filter((i) => i.id !== id),
      );

      await handlers.onMutate({ id: 1 });

      const cached = qc.getQueryData<{ data: Item[] }>(QUERY_KEY);
      expect(cached?.data).toEqual([{ id: 2, text: "second" }]);
    });

    it("returns snapshot of previous cache state", async () => {
      const handlers = buildHandlers<{ id: number }>((items, { id }) =>
        items.filter((i) => i.id !== id),
      );

      const ctx = await handlers.onMutate({ id: 1 });

      expect(ctx.snapshot).toEqual({ data: seed });
    });

    it("cancels in-flight queries", async () => {
      const cancelSpy = vi.spyOn(qc, "cancelQueries");
      const handlers = buildHandlers<{ id: number }>((items) => items);

      await handlers.onMutate({ id: 1 });

      expect(cancelSpy).toHaveBeenCalledWith({ queryKey: QUERY_KEY });
    });
  });

  describe("onError", () => {
    it("restores cache from snapshot", async () => {
      const handlers = buildHandlers<{ id: number }>((items, { id }) =>
        items.filter((i) => i.id !== id),
      );

      const ctx = await handlers.onMutate({ id: 1 });
      // Cache now has only item 2
      expect(qc.getQueryData<{ data: Item[] }>(QUERY_KEY)?.data).toHaveLength(
        1,
      );

      handlers.onError(new Error("fail"), { id: 1 }, ctx);

      // Cache restored to original
      const cached = qc.getQueryData<{ data: Item[] }>(QUERY_KEY);
      expect(cached?.data).toEqual(seed);
    });

    it("calls handleError callback", () => {
      const handlers = buildHandlers<{ id: number }>((items) => items);

      handlers.onError(new Error("fail"), { id: 1 }, undefined);

      expect(handleError).toHaveBeenCalledOnce();
    });

    it("handles missing context gracefully", () => {
      const handlers = buildHandlers<{ id: number }>((items) => items);

      // Should not throw when context is undefined
      expect(() =>
        handlers.onError(new Error("fail"), { id: 1 }, undefined),
      ).not.toThrow();
      expect(handleError).toHaveBeenCalledOnce();
    });
  });

  describe("onSettled", () => {
    it("invalidates queries", () => {
      const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
      const handlers = buildHandlers<{ id: number }>((items) => items);

      handlers.onSettled(undefined, undefined, { id: 1 });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QUERY_KEY });
    });
  });

  describe("update scenario (toggle)", () => {
    it("optimistically updates an item and rolls back on error", async () => {
      const handlers = buildHandlers<{
        id: number;
        completed: boolean;
      }>((items, { id, completed }) =>
        items.map((i) => (i.id === id ? { ...i, text: `${completed}` } : i)),
      );

      const ctx = await handlers.onMutate({ id: 1, completed: true });

      // Verify optimistic update applied
      const cached = qc.getQueryData<{ data: Item[] }>(QUERY_KEY);
      expect(cached?.data[0].text).toBe("true");

      // Simulate server error → rollback
      handlers.onError(
        new Error("server error"),
        { id: 1, completed: true },
        ctx,
      );

      const restored = qc.getQueryData<{ data: Item[] }>(QUERY_KEY);
      expect(restored?.data[0].text).toBe("first");
      expect(handleError).toHaveBeenCalledOnce();
    });
  });
});
