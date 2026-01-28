// ABOUTME: Resamples audio from one sample rate to another
// ABOUTME: Uses linear interpolation for quality/speed balance

import type { TransformConfig } from "./types.js";
import { DEFAULT_TRANSFORM_CONFIG } from "./types.js";

export class Resampler {
  private inputRate: number;
  private outputRate: number;
  private ratio: number;

  constructor(config: Partial<TransformConfig> = {}) {
    const fullConfig = { ...DEFAULT_TRANSFORM_CONFIG, ...config };
    this.inputRate = fullConfig.inputSampleRate;
    this.outputRate = fullConfig.outputSampleRate;
    this.ratio = this.outputRate / this.inputRate;
  }

  /**
   * Resample PCM s16le audio
   */
  resample(input: Buffer): Buffer {
    if (input.length === 0) {
      return Buffer.alloc(0);
    }

    // Pass through if same rate
    if (this.inputRate === this.outputRate) {
      return input;
    }

    const bytesPerSample = 2;
    const inputSamples = Math.floor(input.length / bytesPerSample);
    const outputSamples = Math.floor(inputSamples * this.ratio);

    if (outputSamples === 0) {
      return Buffer.alloc(0);
    }

    const output = Buffer.alloc(outputSamples * bytesPerSample);

    // Linear interpolation resampling
    for (let i = 0; i < outputSamples; i++) {
      // Calculate source position
      const srcPos = i / this.ratio;
      const srcIndex = Math.floor(srcPos);
      const frac = srcPos - srcIndex;

      // Get samples for interpolation
      const sample1 = this.getSample(input, srcIndex);
      const sample2 = this.getSample(input, srcIndex + 1);

      // Linear interpolation
      const interpolated = Math.round(sample1 + (sample2 - sample1) * frac);
      const clamped = Math.max(-32768, Math.min(32767, interpolated));

      output.writeInt16LE(clamped, i * bytesPerSample);
    }

    return output;
  }

  private getSample(buffer: Buffer, index: number): number {
    const maxIndex = Math.floor(buffer.length / 2) - 1;
    const clampedIndex = Math.max(0, Math.min(maxIndex, index));
    return buffer.readInt16LE(clampedIndex * 2);
  }
}
