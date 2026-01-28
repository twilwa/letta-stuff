// ABOUTME: Tests for TTSOutputBridge integration layer
// ABOUTME: Verifies TTS-to-playback flow, barge-in, errors, and metrics

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventEmitter } from "events";
import type {
  AudioSegment,
  PlaybackStats,
} from "../../../../src/voice/output/types.js";
import type { TTSOptions } from "../../../../src/voice/output/tts/types.js";
import type { TTSMetrics } from "../../../../src/voice/output/tts/manager.js";

// Mock classes
class MockTTSManager extends EventEmitter {
  synthesize = vi.fn();
  getMetrics = vi.fn();
}

class MockAudioOutputManager extends EventEmitter {
  play = vi.fn();
  stop = vi.fn();
  isPlaying = vi.fn();
  getStats = vi.fn();
}

// Import after mocks are defined
import {
  TTSOutputBridge,
  TTSOutputBridgeConfig,
} from "../../../../src/voice/output/tts-output-bridge.js";

describe("TTSOutputBridge", () => {
  let ttsManager: MockTTSManager;
  let audioOutputManager: MockAudioOutputManager;
  let bridge: TTSOutputBridge;
  const guildId = "test-guild-123";

  beforeEach(() => {
    ttsManager = new MockTTSManager();
    audioOutputManager = new MockAudioOutputManager();
    bridge = new TTSOutputBridge(ttsManager as any, audioOutputManager as any, {
      defaultVoice: "test-voice",
      defaultSpeed: 1.0,
    });
  });

  describe("speak()", () => {
    it("should synthesize text and play audio segment", async () => {
      const text = "Hello, world!";
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text,
        requestedAt: Date.now(),
      };

      ttsManager.synthesize.mockResolvedValue(segment);

      await bridge.speak(guildId, text);

      expect(ttsManager.synthesize).toHaveBeenCalledWith(text, {});
      expect(audioOutputManager.play).toHaveBeenCalledWith(guildId, segment);
    });

    it("should pass TTS options to synthesize", async () => {
      const text = "Custom voice test";
      const options: TTSOptions = {
        voiceId: "custom-voice",
        speed: 1.5,
      };
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text,
      };

      ttsManager.synthesize.mockResolvedValue(segment);

      await bridge.speak(guildId, text, options);

      expect(ttsManager.synthesize).toHaveBeenCalledWith(text, options);
      expect(audioOutputManager.play).toHaveBeenCalledWith(guildId, segment);
    });

    it("should throw error if TTS synthesis fails", async () => {
      const text = "Error test";
      const error = new Error("TTS synthesis failed");

      ttsManager.synthesize.mockRejectedValue(error);

      await expect(bridge.speak(guildId, text)).rejects.toThrow(
        "TTS synthesis failed",
      );
      expect(audioOutputManager.play).not.toHaveBeenCalled();
    });

    it("should emit error if playback fails", async () => {
      const text = "Playback error test";
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text,
      };

      ttsManager.synthesize.mockResolvedValue(segment);
      audioOutputManager.play.mockImplementation(() => {
        throw new Error("Playback failed");
      });

      const errorSpy = vi.fn();
      bridge.on("error", errorSpy);

      await expect(bridge.speak(guildId, text)).rejects.toThrow(
        "Playback failed",
      );
      expect(errorSpy).toHaveBeenCalledWith(guildId, expect.any(Error));
    });
  });

  describe("stop()", () => {
    it("should stop playback for guild", () => {
      bridge.stop(guildId);

      expect(audioOutputManager.stop).toHaveBeenCalledWith(guildId);
    });

    it("should update speaking state", async () => {
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text: "Test",
      };

      ttsManager.synthesize.mockResolvedValue(segment);
      audioOutputManager.isPlaying.mockReturnValue(true);

      await bridge.speak(guildId, "Test");
      expect(bridge.isSpeaking(guildId)).toBe(true);

      audioOutputManager.isPlaying.mockReturnValue(false);
      bridge.stop(guildId);

      expect(bridge.isSpeaking(guildId)).toBe(false);
    });
  });

  describe("isSpeaking()", () => {
    it("should return false when not speaking", () => {
      audioOutputManager.isPlaying.mockReturnValue(false);

      expect(bridge.isSpeaking(guildId)).toBe(false);
    });

    it("should return true when speaking", async () => {
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text: "Test",
      };

      ttsManager.synthesize.mockResolvedValue(segment);
      audioOutputManager.isPlaying.mockReturnValue(true);

      await bridge.speak(guildId, "Test");

      expect(bridge.isSpeaking(guildId)).toBe(true);
    });

    it("should return false after playback finishes", async () => {
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text: "Test",
      };

      ttsManager.synthesize.mockResolvedValue(segment);
      audioOutputManager.isPlaying.mockReturnValue(true);

      await bridge.speak(guildId, "Test");
      expect(bridge.isSpeaking(guildId)).toBe(true);

      // Simulate playback finished
      audioOutputManager.isPlaying.mockReturnValue(false);
      audioOutputManager.emit("playbackFinished", guildId);

      expect(bridge.isSpeaking(guildId)).toBe(false);
    });
  });

  describe("barge-in handling", () => {
    it("should stop speaking on barge-in event", async () => {
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text: "Test",
      };

      ttsManager.synthesize.mockResolvedValue(segment);
      audioOutputManager.isPlaying.mockReturnValue(true);

      await bridge.speak(guildId, "Test");

      // Simulate barge-in
      audioOutputManager.emit("bargeIn", guildId, "user-123");

      expect(audioOutputManager.stop).toHaveBeenCalledWith(guildId);
    });

    it("should emit bargeIn event", async () => {
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text: "Test",
      };

      ttsManager.synthesize.mockResolvedValue(segment);
      audioOutputManager.isPlaying.mockReturnValue(true);

      const bargeInSpy = vi.fn();
      bridge.on("bargeIn", bargeInSpy);

      await bridge.speak(guildId, "Test");

      // Simulate barge-in
      audioOutputManager.emit("bargeIn", guildId, "user-123");

      expect(bargeInSpy).toHaveBeenCalledWith(guildId, "user-123");
    });
  });

  describe("error propagation", () => {
    it("should propagate TTS errors", async () => {
      const error = new Error("TTS error");
      ttsManager.synthesize.mockRejectedValue(error);

      const errorSpy = vi.fn();
      bridge.on("error", errorSpy);

      await expect(bridge.speak(guildId, "Test")).rejects.toThrow("TTS error");
      expect(errorSpy).toHaveBeenCalledWith(guildId, error);
    });

    it("should propagate playback errors", async () => {
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text: "Test",
      };

      ttsManager.synthesize.mockResolvedValue(segment);

      const errorSpy = vi.fn();
      bridge.on("error", errorSpy);

      await bridge.speak(guildId, "Test");

      // Simulate playback error
      const playbackError = new Error("Playback error");
      audioOutputManager.emit("error", guildId, playbackError);

      expect(errorSpy).toHaveBeenCalledWith(guildId, playbackError);
    });
  });

  describe("metrics aggregation", () => {
    it("should combine TTS and playback metrics", () => {
      const ttsMetrics: TTSMetrics = {
        synthesisCount: 10,
        fallbackCount: 2,
        averageLatency: 150,
        timeToFirstAudio: 100,
      };

      const playbackStats: PlaybackStats = {
        totalPlayed: 8,
        totalPlaybackTime: 5000,
        interruptionCount: 1,
        averageTTSLatency: 120,
      };

      ttsManager.getMetrics.mockReturnValue(ttsMetrics);
      audioOutputManager.getStats.mockReturnValue(playbackStats);

      const metrics = bridge.getMetrics(guildId);

      expect(metrics.tts).toEqual(ttsMetrics);
      expect(metrics.playback).toEqual(playbackStats);
    });

    it("should handle missing playback stats", () => {
      const ttsMetrics: TTSMetrics = {
        synthesisCount: 5,
        fallbackCount: 0,
        averageLatency: 100,
        timeToFirstAudio: 80,
      };

      ttsManager.getMetrics.mockReturnValue(ttsMetrics);
      audioOutputManager.getStats.mockReturnValue(undefined);

      const metrics = bridge.getMetrics(guildId);

      expect(metrics.tts).toEqual(ttsMetrics);
      expect(metrics.playback).toBeUndefined();
    });
  });

  describe("event forwarding", () => {
    it("should forward playbackStarted events", async () => {
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text: "Test",
      };

      ttsManager.synthesize.mockResolvedValue(segment);

      const playbackStartedSpy = vi.fn();
      bridge.on("playbackStarted", playbackStartedSpy);

      await bridge.speak(guildId, "Test");

      // Simulate playback started
      audioOutputManager.emit("playbackStarted", guildId, segment);

      expect(playbackStartedSpy).toHaveBeenCalledWith(guildId, segment);
    });

    it("should forward playbackFinished events", async () => {
      const segment: AudioSegment = {
        data: Buffer.from("audio-data"),
        streaming: false,
        text: "Test",
      };

      ttsManager.synthesize.mockResolvedValue(segment);

      const playbackFinishedSpy = vi.fn();
      bridge.on("playbackFinished", playbackFinishedSpy);

      await bridge.speak(guildId, "Test");

      // Simulate playback finished
      audioOutputManager.emit("playbackFinished", guildId);

      expect(playbackFinishedSpy).toHaveBeenCalledWith(guildId);
    });
  });
});
