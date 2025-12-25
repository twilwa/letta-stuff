// ABOUTME: Type definitions for voice connection module
// ABOUTME: Events, state types, and configuration interfaces

import type { VoiceConnection, VoiceConnectionState } from "@discordjs/voice";
import type { VoiceBasedChannel, StageChannel } from "discord.js";

export interface VoiceConnectionEvents {
  ready: (guildId: string) => void;
  disconnected: (guildId: string) => void;
  reconnecting: (guildId: string) => void;
  error: (guildId: string, error: Error) => void;
  stageSpeakerRequest: (guildId: string, channel: StageChannel) => void;
}

export interface ConnectionManagerConfig {
  /** Timeout for waiting for connection to be ready (ms) */
  readyTimeout?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Base delay for exponential backoff (ms) */
  reconnectBaseDelay?: number;
}

export const DEFAULT_CONFIG: Required<ConnectionManagerConfig> = {
  readyTimeout: 30_000,
  maxReconnectAttempts: 5,
  reconnectBaseDelay: 1000,
};
