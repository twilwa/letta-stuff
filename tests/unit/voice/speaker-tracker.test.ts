// ABOUTME: Tests for SpeakerTracker class
// ABOUTME: Verifies speaker state tracking, SSRC mapping, and event emission

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SpeakerTracker } from "../../../src/voice/input/speaker-tracker.js";

describe("SpeakerTracker", () => {
  let tracker: SpeakerTracker;

  beforeEach(() => {
    tracker = new SpeakerTracker();
  });

  describe("Speaking state tracking", () => {
    it("should emit speakingStart when user starts speaking", () => {
      const handler = vi.fn();
      tracker.on("speakingStart", handler);

      tracker.startSpeaking("user123", 12345);

      expect(handler).toHaveBeenCalledWith("user123");
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should not emit speakingStart twice for same user", () => {
      const handler = vi.fn();
      tracker.on("speakingStart", handler);

      tracker.startSpeaking("user123", 12345);
      tracker.startSpeaking("user123", 12345);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should emit speakingStop when user stops speaking", () => {
      const handler = vi.fn();
      tracker.on("speakingStop", handler);

      tracker.startSpeaking("user123", 12345);
      tracker.stopSpeaking("user123");

      expect(handler).toHaveBeenCalledWith("user123", expect.any(Number));
    });

    it("should calculate speaking duration correctly", () => {
      const handler = vi.fn();
      tracker.on("speakingStop", handler);

      const startTime = Date.now();
      tracker.startSpeaking("user123", 12345);

      // Simulate 500ms delay
      setTimeout(() => {
        tracker.stopSpeaking("user123");

        const duration = handler.mock.calls[0][1];
        expect(duration).toBeGreaterThanOrEqual(500);
        expect(duration).toBeLessThan(600);
      }, 500);
    });

    it("should handle stop without start gracefully", () => {
      const handler = vi.fn();
      tracker.on("speakingStop", handler);

      tracker.stopSpeaking("user123");

      // Should not emit event or crash
      expect(handler).not.toHaveBeenCalled();
    });

    it("should track multiple speakers independently", () => {
      const startHandler = vi.fn();
      tracker.on("speakingStart", startHandler);

      tracker.startSpeaking("user1", 111);
      tracker.startSpeaking("user2", 222);
      tracker.startSpeaking("user3", 333);

      expect(startHandler).toHaveBeenCalledTimes(3);
      expect(tracker.getCurrentSpeakers()).toContain("user1");
      expect(tracker.getCurrentSpeakers()).toContain("user2");
      expect(tracker.getCurrentSpeakers()).toContain("user3");
    });
  });

  describe("SSRC mapping", () => {
    it("should map SSRC to userId", () => {
      tracker.setUserIdForSsrc(12345, "user123");

      expect(tracker.getUserIdForSsrc(12345)).toBe("user123");
    });

    it("should return undefined for unknown SSRC", () => {
      expect(tracker.getUserIdForSsrc(99999)).toBeUndefined();
    });

    it("should update mapping for same SSRC", () => {
      tracker.setUserIdForSsrc(12345, "user1");
      tracker.setUserIdForSsrc(12345, "user2");

      expect(tracker.getUserIdForSsrc(12345)).toBe("user2");
    });

    it("should clear SSRC mapping on user disconnect", () => {
      tracker.setUserIdForSsrc(12345, "user123");
      tracker.startSpeaking("user123", 12345);

      tracker.clearUser("user123");

      expect(tracker.getUserIdForSsrc(12345)).toBeUndefined();
      expect(tracker.getCurrentSpeakers()).not.toContain("user123");
    });

    it("should handle multiple SSRCs for same user", () => {
      // User might have multiple streams (audio + video)
      tracker.setUserIdForSsrc(111, "user123");
      tracker.setUserIdForSsrc(222, "user123");

      expect(tracker.getUserIdForSsrc(111)).toBe("user123");
      expect(tracker.getUserIdForSsrc(222)).toBe("user123");
    });

    it("should clear specific SSRC mapping", () => {
      tracker.setUserIdForSsrc(12345, "user123");

      tracker.clearSsrc(12345);

      expect(tracker.getUserIdForSsrc(12345)).toBeUndefined();
    });
  });

  describe("Floor state", () => {
    it("should report floor open when no speakers", () => {
      expect(tracker.isFloorOpen()).toBe(true);
    });

    it("should report floor closed when someone is speaking", () => {
      tracker.startSpeaking("user123", 12345);

      expect(tracker.isFloorOpen()).toBe(false);
    });

    it("should report floor open after all speakers stop", () => {
      tracker.startSpeaking("user1", 111);
      tracker.startSpeaking("user2", 222);

      expect(tracker.isFloorOpen()).toBe(false);

      tracker.stopSpeaking("user1");
      expect(tracker.isFloorOpen()).toBe(false);

      tracker.stopSpeaking("user2");
      expect(tracker.isFloorOpen()).toBe(true);
    });

    it("should get current speakers set", () => {
      tracker.startSpeaking("user1", 111);
      tracker.startSpeaking("user2", 222);

      const speakers = tracker.getCurrentSpeakers();

      expect(speakers).toContain("user1");
      expect(speakers).toContain("user2");
      expect(speakers.length).toBe(2);
    });

    it("should return empty array when no speakers", () => {
      expect(tracker.getCurrentSpeakers()).toEqual([]);
    });
  });

  describe("Speaking duration tracking", () => {
    it("should track total speaking time per user", () => {
      const startTime = Date.now();
      tracker.startSpeaking("user123", 12345);

      setTimeout(() => {
        tracker.stopSpeaking("user123");

        const duration = tracker.getSpeakingDuration("user123");
        expect(duration).toBeGreaterThanOrEqual(100);
      }, 100);
    });

    it("should accumulate speaking duration across multiple sessions", () => {
      tracker.startSpeaking("user123", 12345);
      setTimeout(() => {
        tracker.stopSpeaking("user123");

        tracker.startSpeaking("user123", 12345);
        setTimeout(() => {
          tracker.stopSpeaking("user123");

          const duration = tracker.getSpeakingDuration("user123");
          // Should be sum of both sessions
          expect(duration).toBeGreaterThanOrEqual(200);
        }, 100);
      }, 100);
    });

    it("should return 0 for user who never spoke", () => {
      expect(tracker.getSpeakingDuration("unknown")).toBe(0);
    });

    it("should include current session in duration if still speaking", () => {
      tracker.startSpeaking("user123", 12345);

      setTimeout(() => {
        const duration = tracker.getSpeakingDuration("user123");
        expect(duration).toBeGreaterThanOrEqual(100);
      }, 100);
    });
  });

  describe("Cleanup", () => {
    it("should clear all state", () => {
      tracker.setUserIdForSsrc(111, "user1");
      tracker.setUserIdForSsrc(222, "user2");
      tracker.startSpeaking("user1", 111);
      tracker.startSpeaking("user2", 222);

      tracker.clear();

      expect(tracker.getCurrentSpeakers()).toEqual([]);
      expect(tracker.getUserIdForSsrc(111)).toBeUndefined();
      expect(tracker.getUserIdForSsrc(222)).toBeUndefined();
      expect(tracker.isFloorOpen()).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should handle rapid start/stop cycles", () => {
      const startHandler = vi.fn();
      const stopHandler = vi.fn();
      tracker.on("speakingStart", startHandler);
      tracker.on("speakingStop", stopHandler);

      for (let i = 0; i < 10; i++) {
        tracker.startSpeaking("user123", 12345);
        tracker.stopSpeaking("user123");
      }

      // Should emit events for each cycle
      expect(startHandler).toHaveBeenCalledTimes(10);
      expect(stopHandler).toHaveBeenCalledTimes(10);
    });

    it("should handle SSRC mapping before speaking event", () => {
      tracker.setUserIdForSsrc(12345, "user123");
      tracker.startSpeaking("user123", 12345);

      expect(tracker.getUserIdForSsrc(12345)).toBe("user123");
      expect(tracker.getCurrentSpeakers()).toContain("user123");
    });

    it("should handle speaking event before SSRC mapping", () => {
      // User starts speaking before we know their SSRC
      tracker.startSpeaking("user123", 12345);

      // Later we get the SSRC mapping
      tracker.setUserIdForSsrc(12345, "user123");

      expect(tracker.getUserIdForSsrc(12345)).toBe("user123");
      expect(tracker.getCurrentSpeakers()).toContain("user123");
    });
  });
});
