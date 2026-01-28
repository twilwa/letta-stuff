// ABOUTME: Audio transform pipeline for Discord voice processing
// ABOUTME: Transforms stereo 48kHz to mono 16kHz for STT/wake word

import { ChannelMixer } from "./channel-mixer.js";
import { Resampler } from "./resampler.js";
import type { TransformConfig, TransformStats } from "./types.js";
import { DEFAULT_TRANSFORM_CONFIG } from "./types.js";

export { ChannelMixer } from "./channel-mixer.js";
export { Resampler } from "./resampler.js";
export type { TransformConfig, TransformStats } from "./types.js";

export class AudioTransformPipeline {
  private mixer: ChannelMixer;
  private resampler: Resampler;
  private stats: TransformStats;

  constructor(config: Partial<TransformConfig> = {}) {
    const fullConfig = { ...DEFAULT_TRANSFORM_CONFIG, ...config };

    this.mixer = new ChannelMixer({
      inputChannels: fullConfig.inputChannels,
      outputChannels: fullConfig.outputChannels,
    });

    this.resampler = new Resampler({
      inputSampleRate: fullConfig.inputSampleRate,
      outputSampleRate: fullConfig.outputSampleRate,
    });

    this.stats = {
      packetsProcessed: 0,
      decodeErrors: 0,
      averageLatency: 0,
    };
  }

  /**
   * Transform stereo 48kHz PCM to mono 16kHz PCM
   * Input: PCM s16le, stereo, 48kHz
   * Output: PCM s16le, mono, 16kHz
   */
  transformPCM(input: Buffer): Buffer {
    if (input.length === 0) {
      return Buffer.alloc(0);
    }

    const startTime = Date.now();

    // Step 1: Mix stereo to mono
    const mono = this.mixer.mix(input);

    // Step 2: Resample 48kHz to 16kHz
    const resampled = this.resampler.resample(mono);

    // Track stats
    const latency = Date.now() - startTime;
    this.stats.packetsProcessed++;
    this.stats.averageLatency =
      (this.stats.averageLatency * (this.stats.packetsProcessed - 1) +
        latency) /
      this.stats.packetsProcessed;

    return resampled;
  }

  /**
   * Get processing statistics
   */
  getStats(): TransformStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.stats = {
      packetsProcessed: 0,
      decodeErrors: 0,
      averageLatency: 0,
    };
  }
}
