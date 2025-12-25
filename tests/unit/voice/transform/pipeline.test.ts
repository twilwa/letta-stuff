// ABOUTME: Tests for AudioTransformPipeline
// ABOUTME: Verifies end-to-end transform from Opus to 16kHz mono PCM

import { describe, it, expect, vi } from "vitest";
import { AudioTransformPipeline } from "../../../../src/voice/transform/index.js";

describe("AudioTransformPipeline", () => {
  describe("transform", () => {
    it("transforms stereo 48kHz to mono 16kHz", () => {
      const pipeline = new AudioTransformPipeline();

      // Create stereo 48kHz PCM (pre-decoded)
      // 48 stereo frames = 48 * 2 channels * 2 bytes = 192 bytes
      const stereo48k = Buffer.alloc(192);
      for (let i = 0; i < 48; i++) {
        stereo48k.writeInt16LE(1000, i * 4); // Left
        stereo48k.writeInt16LE(1000, i * 4 + 2); // Right
      }

      const mono16k = pipeline.transformPCM(stereo48k);

      // 48 stereo frames -> 48 mono -> 16 samples at 16kHz
      // 16 * 2 bytes = 32 bytes
      expect(mono16k.length).toBe(32);
    });

    it("handles empty input", () => {
      const pipeline = new AudioTransformPipeline();
      const result = pipeline.transformPCM(Buffer.alloc(0));
      expect(result.length).toBe(0);
    });

    it("tracks statistics", () => {
      const pipeline = new AudioTransformPipeline();

      const stereo48k = Buffer.alloc(192);
      pipeline.transformPCM(stereo48k);
      pipeline.transformPCM(stereo48k);

      const stats = pipeline.getStats();
      expect(stats.packetsProcessed).toBe(2);
    });
  });

  describe("configuration", () => {
    it("accepts custom config", () => {
      const pipeline = new AudioTransformPipeline({
        inputSampleRate: 48000,
        outputSampleRate: 8000,
        inputChannels: 2,
        outputChannels: 1,
      });

      expect(pipeline).toBeDefined();
    });

    it("uses defaults when not specified", () => {
      const pipeline = new AudioTransformPipeline();
      expect(pipeline).toBeDefined();
    });
  });

  describe("reset", () => {
    it("resets statistics", () => {
      const pipeline = new AudioTransformPipeline();

      pipeline.transformPCM(Buffer.alloc(192));
      expect(pipeline.getStats().packetsProcessed).toBe(1);

      pipeline.reset();
      expect(pipeline.getStats().packetsProcessed).toBe(0);
    });
  });
});
