// ABOUTME: Type definitions for audio input module
// ABOUTME: Events, configuration interfaces, and audio packet types

import type { VoiceConnection } from "@discordjs/voice";

export interface AudioInputEvents {
  audio: (userId: string, packet: Buffer, timestamp: number) => void;
  speakingStart: (userId: string) => void;
  speakingStop: (userId: string, duration: number) => void;
  error: (error: Error) => void;
}

export interface AudioInputConfig {
  /** Buffer size in seconds (alternative to capacity) */
  bufferSeconds?: number;
  /** Frame duration in milliseconds (for capacity calculation) */
  frameDurationMs?: number;
  /** Direct buffer capacity in packets (overrides bufferSeconds) */
  capacity?: number;
}

export interface AudioPacket {
  /** Raw Opus audio data */
  data: Buffer;
  /** Timestamp when packet was received */
  timestamp: number;
}

export interface WindowOptions {
  /** Maximum number of packets to return */
  maxPackets?: number;
  /** Maximum age of packets in milliseconds */
  maxAgeMs?: number;
}

export const DEFAULT_AUDIO_INPUT_CONFIG: Required<
  Omit<AudioInputConfig, "capacity">
> = {
  bufferSeconds: 5,
  frameDurationMs: 20,
};
