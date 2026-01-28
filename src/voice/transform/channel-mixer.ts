// ABOUTME: Mixes stereo audio to mono by averaging channels
// ABOUTME: Passes through mono audio unchanged

import type { TransformConfig } from "./types.js";
import { DEFAULT_TRANSFORM_CONFIG } from "./types.js";

export class ChannelMixer {
  private inputChannels: number;
  private outputChannels: number;

  constructor(config: Partial<TransformConfig> = {}) {
    const fullConfig = { ...DEFAULT_TRANSFORM_CONFIG, ...config };
    this.inputChannels = fullConfig.inputChannels;
    this.outputChannels = fullConfig.outputChannels;
  }

  /**
   * Mix channels (stereo to mono)
   * Input/output format: PCM s16le
   */
  mix(input: Buffer): Buffer {
    if (input.length === 0) {
      return Buffer.alloc(0);
    }

    // Pass through if already mono or same channel count
    if (this.inputChannels === this.outputChannels) {
      return input;
    }

    // Stereo to mono: average left and right channels
    if (this.inputChannels === 2 && this.outputChannels === 1) {
      return this.stereoToMono(input);
    }

    // Unsupported conversion, pass through
    return input;
  }

  private stereoToMono(stereo: Buffer): Buffer {
    const bytesPerSample = 2; // 16-bit
    const bytesPerFrame = bytesPerSample * 2; // stereo = 2 channels
    const frameCount = Math.floor(stereo.length / bytesPerFrame);

    const mono = Buffer.alloc(frameCount * bytesPerSample);

    for (let i = 0; i < frameCount; i++) {
      const left = stereo.readInt16LE(i * bytesPerFrame);
      const right = stereo.readInt16LE(i * bytesPerFrame + bytesPerSample);

      // Average and clamp to 16-bit range
      const avg = Math.floor((left + right) / 2);
      const clamped = Math.max(-32768, Math.min(32767, avg));

      mono.writeInt16LE(clamped, i * bytesPerSample);
    }

    return mono;
  }
}
