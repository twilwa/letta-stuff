// ABOUTME: Type definitions for voice output module
// ABOUTME: Events, audio interfaces, and configuration for playback

import type { AudioPlayer, AudioPlayerState } from "@discordjs/voice";
import type { Readable } from "stream";

/**
 * Audio segment from TTS or other source
 */
export interface AudioSegment {
  /** PCM audio data or stream */
  data: Buffer | Readable;
  /** Whether this is streaming (partial) or complete audio */
  streaming: boolean;
  /** Metadata about what was said (for context tracking) */
  text?: string;
  /** Timestamp when TTS request was made (for latency tracking) */
  requestedAt?: number;
  /** Voice/model used for generation */
  voice?: string;
}

/**
 * Playback statistics
 */
export interface PlaybackStats {
  /** Total audio segments played */
  totalPlayed: number;
  /** Total playback time (ms) */
  totalPlaybackTime: number;
  /** Number of times playback was interrupted */
  interruptionCount: number;
  /** Average TTS latency (ms) */
  averageTTSLatency: number;
}

/**
 * Barge-in detection configuration
 */
export interface BargeInConfig {
  /** Enable barge-in detection */
  enabled: boolean;
  /** Minimum user speech duration to trigger barge-in (ms) */
  minSpeechDuration?: number;
  /** Cooldown after bot stops speaking before barge-in is active (ms) */
  cooldownAfterSpeaking?: number;
}

export const DEFAULT_BARGE_IN_CONFIG: Required<BargeInConfig> = {
  enabled: true,
  minSpeechDuration: 0, // Changed to 0 for immediate triggering by default
  cooldownAfterSpeaking: 200,
};

/**
 * Audio output manager events
 */
export interface AudioOutputEvents {
  /** Playback started */
  playbackStarted: (guildId: string, segment: AudioSegment) => void;
  /** Playback finished normally */
  playbackFinished: (guildId: string) => void;
  /** Playback stopped (manually or by error) */
  playbackStopped: (guildId: string) => void;
  /** Queue became empty */
  queueEmpty: (guildId: string) => void;
  /** Barge-in detected - user started speaking */
  bargeIn: (guildId: string, userId: string) => void;
  /** Error during playback */
  error: (guildId: string, error: Error) => void;
}

/**
 * Audio queue item
 */
export interface QueueItem {
  segment: AudioSegment;
  enqueuedAt: number;
}
