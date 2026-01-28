// ABOUTME: Tests for BargeInDetector - monitors user speech during playback
// ABOUTME: Verifies speech detection, cooldown periods, and interruption events

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BargeInDetector } from "../../../../src/voice/output/barge-in.js";
import type { BargeInConfig } from "../../../../src/voice/output/types.js";

describe("BargeInDetector", () => {
  let detector: BargeInDetector;

  beforeEach(() => {
    detector = new BargeInDetector();
  });

  describe("user speech detection", () => {
    it("emits bargeIn when user speaks during playback", () => {
      const bargeInHandler = vi.fn();
      detector.on("bargeIn", bargeInHandler);

      detector.startPlayback();
      detector.onUserSpeechStart("user-123");

      expect(bargeInHandler).toHaveBeenCalledWith("user-123");
    });

    it("does not emit bargeIn when not playing", () => {
      const bargeInHandler = vi.fn();
      detector.on("bargeIn", bargeInHandler);

      detector.onUserSpeechStart("user-123");

      expect(bargeInHandler).not.toHaveBeenCalled();
    });

    it("does not emit bargeIn when disabled", () => {
      const disabledDetector = new BargeInDetector({ enabled: false });
      const bargeInHandler = vi.fn();
      disabledDetector.on("bargeIn", bargeInHandler);

      disabledDetector.startPlayback();
      disabledDetector.onUserSpeechStart("user-123");

      expect(bargeInHandler).not.toHaveBeenCalled();
    });

    it("emits bargeIn for different users", () => {
      vi.useFakeTimers();
      const bargeInHandler = vi.fn();
      detector.on("bargeIn", bargeInHandler);

      detector.startPlayback();
      detector.onUserSpeechStart("user-1");
      detector.stopPlayback();

      // Advance past cooldown period
      vi.advanceTimersByTime(300);

      detector.startPlayback();
      detector.onUserSpeechStart("user-2");

      expect(bargeInHandler).toHaveBeenCalledTimes(2);
      expect(bargeInHandler).toHaveBeenNthCalledWith(1, "user-1");
      expect(bargeInHandler).toHaveBeenNthCalledWith(2, "user-2");
      vi.useRealTimers();
    });
  });

  describe("playback state tracking", () => {
    it("tracks playback start", () => {
      expect(detector.isPlaying()).toBe(false);

      detector.startPlayback();

      expect(detector.isPlaying()).toBe(true);
    });

    it("tracks playback stop", () => {
      detector.startPlayback();
      expect(detector.isPlaying()).toBe(true);

      detector.stopPlayback();

      expect(detector.isPlaying()).toBe(false);
    });

    it("handles multiple start calls idempotently", () => {
      detector.startPlayback();
      detector.startPlayback();
      detector.startPlayback();

      expect(detector.isPlaying()).toBe(true);
    });
  });

  describe("cooldown period", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not trigger barge-in during cooldown after stopping", () => {
      const config: BargeInConfig = {
        enabled: true,
        cooldownAfterSpeaking: 500,
      };
      const cooledDetector = new BargeInDetector(config);
      const bargeInHandler = vi.fn();
      cooledDetector.on("bargeIn", bargeInHandler);

      cooledDetector.startPlayback();
      cooledDetector.stopPlayback();

      // Immediately after stop - still in cooldown
      cooledDetector.onUserSpeechStart("user-123");
      expect(bargeInHandler).not.toHaveBeenCalled();

      // Advance past cooldown
      vi.advanceTimersByTime(500);
      cooledDetector.startPlayback();
      cooledDetector.onUserSpeechStart("user-123");

      expect(bargeInHandler).toHaveBeenCalledWith("user-123");
    });

    it("allows immediate barge-in when cooldown is 0", () => {
      const config: BargeInConfig = {
        enabled: true,
        cooldownAfterSpeaking: 0,
      };
      const noCooldownDetector = new BargeInDetector(config);
      const bargeInHandler = vi.fn();
      noCooldownDetector.on("bargeIn", bargeInHandler);

      noCooldownDetector.startPlayback();
      noCooldownDetector.stopPlayback();
      noCooldownDetector.startPlayback();
      noCooldownDetector.onUserSpeechStart("user-123");

      expect(bargeInHandler).toHaveBeenCalledWith("user-123");
    });
  });

  describe("minimum speech duration", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("requires minimum speech duration before triggering", () => {
      const config: BargeInConfig = {
        enabled: true,
        minSpeechDuration: 300,
      };
      const durationDetector = new BargeInDetector(config);
      const bargeInHandler = vi.fn();
      durationDetector.on("bargeIn", bargeInHandler);

      durationDetector.startPlayback();
      durationDetector.onUserSpeechStart("user-123");

      // Not enough time passed
      vi.advanceTimersByTime(200);
      expect(bargeInHandler).not.toHaveBeenCalled();

      // Enough time passed
      vi.advanceTimersByTime(100);
      expect(bargeInHandler).toHaveBeenCalledWith("user-123");
    });

    it("cancels pending barge-in if speech stops early", () => {
      const config: BargeInConfig = {
        enabled: true,
        minSpeechDuration: 300,
      };
      const durationDetector = new BargeInDetector(config);
      const bargeInHandler = vi.fn();
      durationDetector.on("bargeIn", bargeInHandler);

      durationDetector.startPlayback();
      durationDetector.onUserSpeechStart("user-123");

      // User stops speaking before minimum duration
      vi.advanceTimersByTime(200);
      durationDetector.onUserSpeechStop("user-123");

      // Even after minimum duration would have passed
      vi.advanceTimersByTime(200);
      expect(bargeInHandler).not.toHaveBeenCalled();
    });

    it("triggers immediately when minSpeechDuration is 0", () => {
      const config: BargeInConfig = {
        enabled: true,
        minSpeechDuration: 0,
      };
      const immediateDetector = new BargeInDetector(config);
      const bargeInHandler = vi.fn();
      immediateDetector.on("bargeIn", bargeInHandler);

      immediateDetector.startPlayback();
      immediateDetector.onUserSpeechStart("user-123");

      expect(bargeInHandler).toHaveBeenCalledWith("user-123");
    });
  });

  describe("reset", () => {
    it("clears playback state and pending timers", () => {
      vi.useFakeTimers();
      const config: BargeInConfig = {
        enabled: true,
        minSpeechDuration: 300,
      };
      const detector = new BargeInDetector(config);
      const bargeInHandler = vi.fn();
      detector.on("bargeIn", bargeInHandler);

      detector.startPlayback();
      detector.onUserSpeechStart("user-123");
      detector.reset();

      // Should not trigger even after time passes
      vi.advanceTimersByTime(500);
      expect(bargeInHandler).not.toHaveBeenCalled();
      expect(detector.isPlaying()).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("configuration defaults", () => {
    it("uses default config when none provided", () => {
      const defaultDetector = new BargeInDetector();
      const bargeInHandler = vi.fn();
      defaultDetector.on("bargeIn", bargeInHandler);

      defaultDetector.startPlayback();
      defaultDetector.onUserSpeechStart("user-123");

      // Should work with defaults
      expect(bargeInHandler).toHaveBeenCalled();
    });

    it("merges partial config with defaults", () => {
      const partialConfig: BargeInConfig = {
        enabled: true,
        minSpeechDuration: 100,
        // cooldownAfterSpeaking should use default
      };
      const detector = new BargeInDetector(partialConfig);

      // Should not throw and should work
      expect(() => {
        detector.startPlayback();
        detector.onUserSpeechStart("user-123");
      }).not.toThrow();
    });
  });
});
