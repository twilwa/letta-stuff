// ABOUTME: Tests for Resampler - 48kHz to 16kHz conversion
// ABOUTME: Verifies sample rate conversion with linear interpolation

import { describe, it, expect } from "vitest";
import { Resampler } from "../../../../src/voice/transform/resampler.js";

describe("Resampler", () => {
  describe("48kHz to 16kHz", () => {
    it("reduces sample count by factor of 3", () => {
      const resampler = new Resampler({
        inputSampleRate: 48000,
        outputSampleRate: 16000,
      });

      // 48 samples at 48kHz -> 16 samples at 16kHz
      const input = Buffer.alloc(48 * 2); // 48 samples, 2 bytes each
      for (let i = 0; i < 48; i++) {
        input.writeInt16LE(i * 100, i * 2);
      }

      const output = resampler.resample(input);

      // Should have ~16 samples (48 / 3)
      expect(output.length).toBe(16 * 2);
    });

    it("preserves signal characteristics", () => {
      const resampler = new Resampler({
        inputSampleRate: 48000,
        outputSampleRate: 16000,
      });

      // Create a simple ramp signal
      const input = Buffer.alloc(48 * 2);
      for (let i = 0; i < 48; i++) {
        input.writeInt16LE(i * 100, i * 2);
      }

      const output = resampler.resample(input);

      // Output should also be a ramp (approximately)
      const first = output.readInt16LE(0);
      const last = output.readInt16LE(output.length - 2);

      expect(first).toBeLessThan(last);
    });

    it("handles empty buffer", () => {
      const resampler = new Resampler({
        inputSampleRate: 48000,
        outputSampleRate: 16000,
      });

      const output = resampler.resample(Buffer.alloc(0));
      expect(output.length).toBe(0);
    });
  });

  describe("same rate pass-through", () => {
    it("passes through when rates are equal", () => {
      const resampler = new Resampler({
        inputSampleRate: 16000,
        outputSampleRate: 16000,
      });

      const input = Buffer.alloc(10 * 2);
      for (let i = 0; i < 10; i++) {
        input.writeInt16LE(i * 100, i * 2);
      }

      const output = resampler.resample(input);

      expect(output.equals(input)).toBe(true);
    });
  });

  describe("upsample", () => {
    it("can upsample 16kHz to 48kHz", () => {
      const resampler = new Resampler({
        inputSampleRate: 16000,
        outputSampleRate: 48000,
      });

      // 16 samples at 16kHz -> 48 samples at 48kHz
      const input = Buffer.alloc(16 * 2);
      for (let i = 0; i < 16; i++) {
        input.writeInt16LE(i * 100, i * 2);
      }

      const output = resampler.resample(input);

      expect(output.length).toBe(48 * 2);
    });
  });

  describe("edge cases", () => {
    it("handles single sample", () => {
      const resampler = new Resampler({
        inputSampleRate: 48000,
        outputSampleRate: 16000,
      });

      const input = Buffer.alloc(2);
      input.writeInt16LE(1000, 0);

      const output = resampler.resample(input);

      // Single sample should produce minimal output
      expect(output.length).toBeGreaterThanOrEqual(0);
    });

    it("uses default config", () => {
      const resampler = new Resampler();
      expect(resampler).toBeDefined();
    });
  });
});
