import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TranscriptAggregator } from "../../../../../src/voice/input/stt/aggregator";
import type { TranscriptionEvent } from "../../../../../src/voice/input/stt/types";

describe("TranscriptAggregator", () => {
  let aggregator: TranscriptAggregator;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (aggregator) {
      aggregator.destroy();
    }
    vi.restoreAllMocks();
  });

  describe("Partial Buffering", () => {
    it("should buffer partial transcripts for a user", () => {
      aggregator = new TranscriptAggregator();

      const event: TranscriptionEvent = {
        text: "Hello",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      };

      aggregator.process(event);

      expect(aggregator.getPending("user1")).toBe("Hello");
    });

    it("should replace buffer with new partial (cumulative)", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "Hello",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.process({
        text: "Hello world",
        isFinal: false,
        confidence: 0.95,
        userId: "user1",
      });

      expect(aggregator.getPending("user1")).toBe("Hello world");
    });

    it("should maintain separate buffers for different users", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "User one speaking",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.process({
        text: "User two speaking",
        isFinal: false,
        confidence: 0.9,
        userId: "user2",
      });

      expect(aggregator.getPending("user1")).toBe("User one speaking");
      expect(aggregator.getPending("user2")).toBe("User two speaking");
    });

    it("should return empty string for user with no pending text", () => {
      aggregator = new TranscriptAggregator();

      expect(aggregator.getPending("nonexistent")).toBe("");
    });
  });

  describe("Final Transcript Emission", () => {
    it("should emit utterance event when isFinal is true", () => {
      aggregator = new TranscriptAggregator();
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "Complete sentence",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      expect(utteranceSpy).toHaveBeenCalledTimes(1);
      expect(utteranceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user1",
          text: "Complete sentence",
          confidence: 0.95,
          isFinal: true,
        })
      );
    });

    it("should clear buffer after emitting final transcript", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "Complete sentence",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      expect(aggregator.getPending("user1")).toBe("");
    });

    it("should emit turn event when final transcript is emitted", () => {
      aggregator = new TranscriptAggregator();
      const turnSpy = vi.fn();
      aggregator.on("turn", turnSpy);

      aggregator.process({
        text: "Complete sentence",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      expect(turnSpy).toHaveBeenCalledTimes(1);
      expect(turnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user1",
          text: "Complete sentence",
        })
      );
    });

    it("should include timestamps in aggregated transcript", () => {
      aggregator = new TranscriptAggregator();
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      const startTime = Date.now();
      vi.setSystemTime(startTime);

      aggregator.process({
        text: "Partial",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      vi.advanceTimersByTime(100);

      aggregator.process({
        text: "Partial complete",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      expect(utteranceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        })
      );

      const call = utteranceSpy.mock.calls[0][0];
      expect(call.endTime).toBeGreaterThanOrEqual(call.startTime);
    });
  });

  describe("Timeout-based Flushing", () => {
    it("should flush pending buffer after timeout", () => {
      aggregator = new TranscriptAggregator({ flushTimeout: 1000 });
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "Incomplete",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      expect(utteranceSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);

      expect(utteranceSpy).toHaveBeenCalledTimes(1);
      expect(utteranceSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user1",
          text: "Incomplete",
          isFinal: false,
        })
      );
    });

    it("should reset flush timer on new partial", () => {
      aggregator = new TranscriptAggregator({ flushTimeout: 1000 });
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "First",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      vi.advanceTimersByTime(500);

      aggregator.process({
        text: "First second",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      vi.advanceTimersByTime(500);
      expect(utteranceSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(utteranceSpy).toHaveBeenCalledTimes(1);
    });

    it("should clear buffer after timeout flush", () => {
      aggregator = new TranscriptAggregator({ flushTimeout: 1000 });

      aggregator.process({
        text: "Incomplete",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      vi.advanceTimersByTime(1000);

      expect(aggregator.getPending("user1")).toBe("");
    });

    it("should use default timeout if not configured", () => {
      aggregator = new TranscriptAggregator();
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "Test",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      // Default should be 2000ms
      vi.advanceTimersByTime(1999);
      expect(utteranceSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(utteranceSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Multi-user Buffering", () => {
    it("should handle independent flush timers per user", () => {
      aggregator = new TranscriptAggregator({ flushTimeout: 1000 });
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "User one",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      vi.advanceTimersByTime(500);

      aggregator.process({
        text: "User two",
        isFinal: false,
        confidence: 0.9,
        userId: "user2",
      });

      vi.advanceTimersByTime(500);

      // User1 should flush
      expect(utteranceSpy).toHaveBeenCalledTimes(1);
      expect(utteranceSpy).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user1" })
      );

      vi.advanceTimersByTime(500);

      // User2 should flush
      expect(utteranceSpy).toHaveBeenCalledTimes(2);
      expect(utteranceSpy).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user2" })
      );
    });

    it("should not interfere with other users when one emits final", () => {
      aggregator = new TranscriptAggregator({ flushTimeout: 1000 });

      aggregator.process({
        text: "User one partial",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.process({
        text: "User two partial",
        isFinal: false,
        confidence: 0.9,
        userId: "user2",
      });

      aggregator.process({
        text: "User one final",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      expect(aggregator.getPending("user1")).toBe("");
      expect(aggregator.getPending("user2")).toBe("User two partial");
    });
  });

  describe("Overlap Detection", () => {
    it("should emit overlap event when multiple users have pending text", () => {
      aggregator = new TranscriptAggregator();
      const overlapSpy = vi.fn();
      aggregator.on("overlap", overlapSpy);

      aggregator.process({
        text: "User one",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.process({
        text: "User two",
        isFinal: false,
        confidence: 0.9,
        userId: "user2",
      });

      expect(overlapSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userIds: expect.arrayContaining(["user1", "user2"]),
        })
      );
    });

    it("should not emit overlap for single user", () => {
      aggregator = new TranscriptAggregator();
      const overlapSpy = vi.fn();
      aggregator.on("overlap", overlapSpy);

      aggregator.process({
        text: "User one",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      expect(overlapSpy).not.toHaveBeenCalled();
    });

    it("should track overlap with three or more users", () => {
      aggregator = new TranscriptAggregator();
      const overlapSpy = vi.fn();
      aggregator.on("overlap", overlapSpy);

      aggregator.process({
        text: "User one",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.process({
        text: "User two",
        isFinal: false,
        confidence: 0.9,
        userId: "user2",
      });

      aggregator.process({
        text: "User three",
        isFinal: false,
        confidence: 0.9,
        userId: "user3",
      });

      const lastCall = overlapSpy.mock.calls[overlapSpy.mock.calls.length - 1][0];
      expect(lastCall.userIds).toHaveLength(3);
    });
  });

  describe("Conversation History", () => {
    it("should track conversation turns in order", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "First utterance",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      aggregator.process({
        text: "Second utterance",
        isFinal: true,
        confidence: 0.95,
        userId: "user2",
      });

      const history = aggregator.getConversationHistory();

      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        userId: "user1",
        text: "First utterance",
      });
      expect(history[1]).toMatchObject({
        userId: "user2",
        text: "Second utterance",
      });
    });

    it("should limit conversation history to specified count", () => {
      aggregator = new TranscriptAggregator();

      for (let i = 0; i < 10; i++) {
        aggregator.process({
          text: `Utterance ${i}`,
          isFinal: true,
          confidence: 0.95,
          userId: "user1",
        });
      }

      const history = aggregator.getConversationHistory(5);

      expect(history).toHaveLength(5);
      expect(history[0].text).toBe("Utterance 5");
      expect(history[4].text).toBe("Utterance 9");
    });

    it("should include timestamps in conversation history", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "Test",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      const history = aggregator.getConversationHistory();

      expect(history[0]).toHaveProperty("timestamp");
      expect(typeof history[0].timestamp).toBe("number");
    });

    it("should return empty array when no history exists", () => {
      aggregator = new TranscriptAggregator();

      const history = aggregator.getConversationHistory();

      expect(history).toEqual([]);
    });
  });

  describe("Buffer Size Limits", () => {
    it("should force flush when buffer exceeds maxBufferSize", () => {
      aggregator = new TranscriptAggregator({ maxBufferSize: 50 });
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "Short",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      expect(utteranceSpy).not.toHaveBeenCalled();

      aggregator.process({
        text: "This is a very long transcript that exceeds the maximum buffer size limit",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      expect(utteranceSpy).toHaveBeenCalledTimes(1);
    });

    it("should use default maxBufferSize if not configured", () => {
      aggregator = new TranscriptAggregator();
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      const longText = "a".repeat(1000);

      aggregator.process({
        text: longText,
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      // Default should be 500, so 1000 chars should trigger flush
      expect(utteranceSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Confidence Filtering", () => {
    it("should ignore transcripts below minConfidence", () => {
      aggregator = new TranscriptAggregator({ minConfidence: 0.8 });

      aggregator.process({
        text: "Low confidence",
        isFinal: false,
        confidence: 0.5,
        userId: "user1",
      });

      expect(aggregator.getPending("user1")).toBe("");
    });

    it("should accept transcripts at or above minConfidence", () => {
      aggregator = new TranscriptAggregator({ minConfidence: 0.8 });

      aggregator.process({
        text: "Good confidence",
        isFinal: false,
        confidence: 0.8,
        userId: "user1",
      });

      expect(aggregator.getPending("user1")).toBe("Good confidence");
    });

    it("should use default minConfidence of 0 if not configured", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "Very low confidence",
        isFinal: false,
        confidence: 0.1,
        userId: "user1",
      });

      expect(aggregator.getPending("user1")).toBe("Very low confidence");
    });
  });

  describe("Manual Flush", () => {
    it("should flush all pending buffers when flush() is called", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "User one pending",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.process({
        text: "User two pending",
        isFinal: false,
        confidence: 0.9,
        userId: "user2",
      });

      const flushed = aggregator.flush();

      expect(flushed).toHaveLength(2);
      expect(flushed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ userId: "user1", text: "User one pending" }),
          expect.objectContaining({ userId: "user2", text: "User two pending" }),
        ])
      );
    });

    it("should clear all buffers after flush", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "Pending",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.flush();

      expect(aggregator.getPending("user1")).toBe("");
    });

    it("should return empty array when no pending buffers", () => {
      aggregator = new TranscriptAggregator();

      const flushed = aggregator.flush();

      expect(flushed).toEqual([]);
    });

    it("should emit utterance events for flushed buffers", () => {
      aggregator = new TranscriptAggregator();
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "Pending",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.flush();

      expect(utteranceSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Clear", () => {
    it("should clear all buffers without emitting events", () => {
      aggregator = new TranscriptAggregator();
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "Pending",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.clear();

      expect(aggregator.getPending("user1")).toBe("");
      expect(utteranceSpy).not.toHaveBeenCalled();
    });

    it("should cancel pending flush timers", () => {
      aggregator = new TranscriptAggregator({ flushTimeout: 1000 });
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "Pending",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.clear();

      vi.advanceTimersByTime(1000);

      expect(utteranceSpy).not.toHaveBeenCalled();
    });

    it("should clear conversation history", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "Final",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      aggregator.clear();

      expect(aggregator.getConversationHistory()).toEqual([]);
    });
  });

  describe("Destroy", () => {
    it("should clean up all timers on destroy", () => {
      aggregator = new TranscriptAggregator({ flushTimeout: 1000 });
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "Pending",
        isFinal: false,
        confidence: 0.9,
        userId: "user1",
      });

      aggregator.destroy();

      vi.advanceTimersByTime(1000);

      expect(utteranceSpy).not.toHaveBeenCalled();
    });

    it("should remove all event listeners on destroy", () => {
      aggregator = new TranscriptAggregator();
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.destroy();

      aggregator.process({
        text: "Final",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      expect(utteranceSpy).not.toHaveBeenCalled();
    });
  });

  describe("Default userId Handling", () => {
    it("should use 'unknown' as default userId when not provided", () => {
      aggregator = new TranscriptAggregator();

      aggregator.process({
        text: "No user ID",
        isFinal: false,
        confidence: 0.9,
      });

      expect(aggregator.getPending("unknown")).toBe("No user ID");
    });

    it("should emit utterance with 'unknown' userId when not provided", () => {
      aggregator = new TranscriptAggregator();
      const utteranceSpy = vi.fn();
      aggregator.on("utterance", utteranceSpy);

      aggregator.process({
        text: "No user ID",
        isFinal: true,
        confidence: 0.95,
      });

      expect(utteranceSpy).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "unknown" })
      );
    });
  });
});
