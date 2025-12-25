// ABOUTME: VoiceConnectionManager for Discord voice channel connections
// ABOUTME: Handles join/leave, state transitions, reconnection, and Stage speaker requests

import { EventEmitter } from "events";
import {
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  VoiceConnectionState,
  entersState,
  VoiceConnectionDisconnectReason,
  generateDependencyReport,
  DiscordGatewayAdapterCreator,
} from "@discordjs/voice";
import { ChannelType, VoiceBasedChannel, StageChannel } from "discord.js";

import {
  VoiceConnectionEvents,
  ConnectionManagerConfig,
  DEFAULT_CONFIG,
} from "./types.js";

export { VoiceConnectionEvents } from "./types.js";

/**
 * Check if all required dependencies for voice are installed
 * Returns the dependency report string for logging/debugging
 */
export function checkDependencies(): string {
  return generateDependencyReport();
}

export class VoiceConnectionManager extends EventEmitter {
  private connections: Map<string, VoiceConnection> = new Map();
  private config: Required<ConnectionManagerConfig>;
  private reconnectAttempts: Map<string, number> = new Map();

  constructor(config: ConnectionManagerConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Join a voice or Stage channel
   * Returns existing connection if already connected to this guild
   */
  async joinChannel(channel: VoiceBasedChannel): Promise<VoiceConnection> {
    const guildId = channel.guild.id;

    // Return existing Ready connection
    const existing = this.connections.get(guildId);
    if (existing && existing.state.status === VoiceConnectionStatus.Ready) {
      return existing;
    }

    // Create new connection
    // Cast required due to discord.js/voice type mismatch
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guildId,
      adapterCreator: channel.guild
        .voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
    });

    this.connections.set(guildId, connection);
    this.setupConnectionListeners(connection, guildId);

    // Handle Stage channel - emit event for speaker request
    if (channel.type === ChannelType.GuildStageVoice) {
      this.emit("stageSpeakerRequest", guildId, channel as StageChannel);
    }

    // Wait for Ready state
    try {
      await entersState(
        connection,
        VoiceConnectionStatus.Ready,
        this.config.readyTimeout,
      );
      this.emit("ready", guildId);
    } catch (error) {
      // Connection failed to become ready
      connection.destroy();
      this.connections.delete(guildId);
      throw new Error(`Failed to connect to voice channel: ${error}`);
    }

    return connection;
  }

  /**
   * Leave a voice channel for a guild
   */
  leaveChannel(guildId: string): void {
    const connection = this.connections.get(guildId);
    if (connection) {
      connection.destroy();
      this.connections.delete(guildId);
    }
  }

  /**
   * Get the active connection for a guild
   */
  getConnection(guildId: string): VoiceConnection | undefined {
    return this.connections.get(guildId);
  }

  /**
   * Check if there's an active Ready connection for a guild
   */
  isConnected(guildId: string): boolean {
    const connection = this.connections.get(guildId);
    return connection?.state.status === VoiceConnectionStatus.Ready;
  }

  /**
   * Destroy all connections and clean up
   */
  destroy(): void {
    for (const [guildId, connection] of this.connections) {
      connection.destroy();
    }
    this.connections.clear();
  }

  private setupConnectionListeners(
    connection: VoiceConnection,
    guildId: string,
  ): void {
    connection.on(
      "stateChange",
      (oldState: VoiceConnectionState, newState: VoiceConnectionState) => {
        this.handleStateChange(connection, guildId, oldState, newState);
      },
    );
  }

  private handleStateChange(
    connection: VoiceConnection,
    guildId: string,
    oldState: VoiceConnectionState,
    newState: VoiceConnectionState,
  ): void {
    const { status: oldStatus } = oldState;
    const { status: newStatus } = newState;

    // Reset reconnect attempts on successful Ready
    if (newStatus === VoiceConnectionStatus.Ready) {
      this.reconnectAttempts.delete(guildId);
      if (oldStatus !== VoiceConnectionStatus.Ready) {
        this.emit("ready", guildId);
      }
    }

    // Handle disconnection with exponential backoff
    if (newStatus === VoiceConnectionStatus.Disconnected) {
      const attempts = this.reconnectAttempts.get(guildId) ?? 0;

      if (attempts >= this.config.maxReconnectAttempts) {
        // Max attempts reached, destroy connection
        connection.destroy();
        this.reconnectAttempts.delete(guildId);
        this.emit(
          "error",
          guildId,
          new Error("Max reconnection attempts reached"),
        );
        return;
      }

      // Attempt rejoin for recoverable disconnects
      if (
        (newState as any).reason ===
          VoiceConnectionDisconnectReason.WebSocketClose ||
        (newState as any).reason === 4014 // Moved to a different channel or disconnected
      ) {
        this.reconnectAttempts.set(guildId, attempts + 1);
        const delay = this.config.reconnectBaseDelay * Math.pow(2, attempts);

        this.emit("reconnecting", guildId);
        setTimeout(() => {
          if (this.connections.has(guildId)) {
            connection.rejoin();
          }
        }, delay);
      }
    }

    // Handle destroyed state
    if (newStatus === VoiceConnectionStatus.Destroyed) {
      this.connections.delete(guildId);
      this.reconnectAttempts.delete(guildId);
      this.emit("disconnected", guildId);
    }
  }
}
