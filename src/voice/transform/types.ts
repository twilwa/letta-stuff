// ABOUTME: Type definitions for audio transform pipeline
// ABOUTME: Configuration and interfaces for Opus decode, resample, channel mix

export interface TransformConfig {
  /** Input sample rate (Discord default: 48000) */
  inputSampleRate?: number;
  /** Output sample rate (STT/wake word default: 16000) */
  outputSampleRate?: number;
  /** Input channels (Discord default: 2 for stereo) */
  inputChannels?: number;
  /** Output channels (default: 1 for mono) */
  outputChannels?: number;
}

export const DEFAULT_TRANSFORM_CONFIG: Required<TransformConfig> = {
  inputSampleRate: 48000,
  outputSampleRate: 16000,
  inputChannels: 2,
  outputChannels: 1,
};

export interface TransformStats {
  /** Total packets processed */
  packetsProcessed: number;
  /** Decode errors encountered */
  decodeErrors: number;
  /** Average latency in ms */
  averageLatency: number;
}
