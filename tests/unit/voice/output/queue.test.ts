// ABOUTME: Tests for AudioQueue - FIFO queue for audio playback
// ABOUTME: Verifies enqueue, dequeue, clear, skip, and event emission

import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioQueue } from "../../../../src/voice/output/queue.js";
import type { AudioSegment } from "../../../../src/voice/output/types.js";
import { TEST_AUDIO } from "../../../fixtures/audio/fixtures.js";

describe("AudioQueue", () => {
  let queue: AudioQueue;

  beforeEach(() => {
    queue = new AudioQueue();
  });

  describe("enqueue", () => {
    it("adds segment to empty queue", () => {
      const segment: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        text: "Hello",
      };

      queue.enqueue(segment);

      expect(queue.size()).toBe(1);
      expect(queue.isEmpty()).toBe(false);
    });

    it("maintains FIFO order", () => {
      const segment1: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        text: "First",
      };
      const segment2: AudioSegment = {
        data: TEST_AUDIO.MEDIUM,
        streaming: false,
        text: "Second",
      };

      queue.enqueue(segment1);
      queue.enqueue(segment2);

      const first = queue.dequeue();
      expect(first?.segment.text).toBe("First");
      const second = queue.dequeue();
      expect(second?.segment.text).toBe("Second");
    });

    it("stores enqueuedAt timestamp", () => {
      const beforeEnqueue = Date.now();
      const segment: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
      };

      queue.enqueue(segment);

      const item = queue.peek();
      expect(item).toBeDefined();
      expect(item!.enqueuedAt).toBeGreaterThanOrEqual(beforeEnqueue);
      expect(item!.enqueuedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("dequeue", () => {
    it("returns undefined when queue is empty", () => {
      expect(queue.dequeue()).toBeUndefined();
    });

    it("removes and returns first item", () => {
      const segment: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        text: "Test",
      };

      queue.enqueue(segment);
      const item = queue.dequeue();

      expect(item?.segment).toBe(segment);
      expect(queue.isEmpty()).toBe(true);
    });

    it("emits queueEmpty event when last item is dequeued", () => {
      const emptyHandler = vi.fn();
      queue.on("queueEmpty", emptyHandler);

      const segment: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
      };

      queue.enqueue(segment);
      queue.dequeue();

      expect(emptyHandler).toHaveBeenCalledTimes(1);
    });

    it("does not emit queueEmpty when items remain", () => {
      const emptyHandler = vi.fn();
      queue.on("queueEmpty", emptyHandler);

      queue.enqueue({ data: TEST_AUDIO.SHORT, streaming: false });
      queue.enqueue({ data: TEST_AUDIO.MEDIUM, streaming: false });

      queue.dequeue();

      expect(emptyHandler).not.toHaveBeenCalled();
    });
  });

  describe("peek", () => {
    it("returns undefined when queue is empty", () => {
      expect(queue.peek()).toBeUndefined();
    });

    it("returns first item without removing", () => {
      const segment: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        text: "Peek test",
      };

      queue.enqueue(segment);
      const peeked = queue.peek();

      expect(peeked?.segment).toBe(segment);
      expect(queue.size()).toBe(1);
    });
  });

  describe("clear", () => {
    it("removes all items from queue", () => {
      queue.enqueue({ data: TEST_AUDIO.SHORT, streaming: false });
      queue.enqueue({ data: TEST_AUDIO.MEDIUM, streaming: false });
      queue.enqueue({ data: TEST_AUDIO.LONG, streaming: false });

      queue.clear();

      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it("emits queueEmpty event when clearing non-empty queue", () => {
      const emptyHandler = vi.fn();
      queue.on("queueEmpty", emptyHandler);

      queue.enqueue({ data: TEST_AUDIO.SHORT, streaming: false });
      queue.clear();

      expect(emptyHandler).toHaveBeenCalledTimes(1);
    });

    it("does not emit queueEmpty when clearing empty queue", () => {
      const emptyHandler = vi.fn();
      queue.on("queueEmpty", emptyHandler);

      queue.clear();

      expect(emptyHandler).not.toHaveBeenCalled();
    });
  });

  describe("size and isEmpty", () => {
    it("correctly reports empty queue", () => {
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it("correctly reports queue with items", () => {
      queue.enqueue({ data: TEST_AUDIO.SHORT, streaming: false });
      queue.enqueue({ data: TEST_AUDIO.MEDIUM, streaming: false });

      expect(queue.isEmpty()).toBe(false);
      expect(queue.size()).toBe(2);
    });

    it("updates size as items are added/removed", () => {
      expect(queue.size()).toBe(0);

      queue.enqueue({ data: TEST_AUDIO.SHORT, streaming: false });
      expect(queue.size()).toBe(1);

      queue.enqueue({ data: TEST_AUDIO.MEDIUM, streaming: false });
      expect(queue.size()).toBe(2);

      queue.dequeue();
      expect(queue.size()).toBe(1);

      queue.clear();
      expect(queue.size()).toBe(0);
    });
  });

  describe("getAll", () => {
    it("returns empty array for empty queue", () => {
      expect(queue.getAll()).toEqual([]);
    });

    it("returns all items in FIFO order without modifying queue", () => {
      const segment1: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        text: "First",
      };
      const segment2: AudioSegment = {
        data: TEST_AUDIO.MEDIUM,
        streaming: false,
        text: "Second",
      };

      queue.enqueue(segment1);
      queue.enqueue(segment2);

      const all = queue.getAll();

      expect(all).toHaveLength(2);
      expect(all[0].segment.text).toBe("First");
      expect(all[1].segment.text).toBe("Second");
      expect(queue.size()).toBe(2); // Queue not modified
    });
  });
});
