// ABOUTME: AudioOutputManager orchestrates audio playback for Discord voice
// ABOUTME: Manages players, queue, barge-in, and playback statistics per guild

import { EventEmitter } from "events";
import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioPlayerState,
  createAudioPlayer,
  createAudioResource,
  AudioResource,
  StreamType,
  VoiceConnection,
} from "@discordjs/voice";
import { Readable } from "stream";

import { AudioQueue } from "./queue.js";
import { BargeInDetector } from "./barge-in.js";
import type {
  AudioSegment,
  PlaybackStats,
  BargeInConfig,
  AudioOutputEvents,
} from "./types.js";

interface GuildAudioState {
  player: AudioPlayer;
  queue: AudioQueue;
  bargeInDetector: BargeInDetector;
  stats: PlaybackStats;
  currentSegment?: AudioSegment;
  isPlayingSegment: boolean;
}

export class AudioOutputManager extends EventEmitter {
  private guilds: Map<string, GuildAudioState> = new Map();
  private bargeInConfig: BargeInConfig;

  constructor(bargeInConfig: BargeInConfig = { enabled: true }) {
    super();
    this.bargeInConfig = bargeInConfig;
  }

  /**
   * Attach audio output to a voice connection
   * Creates player and subscribes to connection
   */
  attachToConnection(guildId: string, connection: VoiceConnection): void {
    // Return if already attached
    if (this.guilds.has(guildId)) {
      return;
    }

    const player = createAudioPlayer();
    const queue = new AudioQueue();
    const bargeInDetector = new BargeInDetector(this.bargeInConfig);
    const stats: PlaybackStats = {
      totalPlayed: 0,
      totalPlaybackTime: 0,
      interruptionCount: 0,
      averageTTSLatency: 0,
    };

    // Subscribe player to connection
    connection.subscribe(player);

    // Set up player state change listener
    player.on(
      "stateChange",
      (oldState: AudioPlayerState, newState: AudioPlayerState) => {
        this.handlePlayerStateChange(guildId, oldState, newState);
      },
    );

    // Set up queue empty listener
    queue.on("queueEmpty", () => {
      // Only emit if we're not currently playing something
      const state = this.guilds.get(guildId);
      if (state && !state.isPlayingSegment) {
        this.emit("queueEmpty", guildId);
      }
    });

    // Set up barge-in listener
    bargeInDetector.on("bargeIn", (userId: string) => {
      this.handleBargeIn(guildId, userId);
    });

    this.guilds.set(guildId, {
      player,
      queue,
      bargeInDetector,
      stats,
      isPlayingSegment: false,
    });
  }

  /**
   * Play an audio segment (immediately if not playing, or enqueue)
   */
  play(guildId: string, segment: AudioSegment): void {
    const state = this.guilds.get(guildId);
    if (!state) {
      throw new Error(`No audio player attached for guild ${guildId}`);
    }

    // If not currently playing a segment, play immediately
    if (!state.isPlayingSegment) {
      this.playSegment(guildId, segment);
    } else {
      // Otherwise, enqueue
      state.queue.enqueue(segment);
    }
  }

  /**
   * Stop current playback and clear queue
   */
  stop(guildId: string): void {
    const state = this.guilds.get(guildId);
    if (!state) {
      return;
    }

    const { player, queue, bargeInDetector } = state;

    player.stop();
    queue.clear();
    bargeInDetector.stopPlayback();
    state.currentSegment = undefined;
    state.isPlayingSegment = false;

    this.emit("playbackStopped", guildId);
  }

  /**
   * Pause current playback
   */
  pause(guildId: string): void {
    const state = this.guilds.get(guildId);
    if (!state) {
      return;
    }

    state.player.pause();
  }

  /**
   * Resume paused playback
   */
  resume(guildId: string): void {
    const state = this.guilds.get(guildId);
    if (!state) {
      return;
    }

    state.player.unpause();
  }

  /**
   * Check if currently playing audio
   */
  isPlaying(guildId: string): boolean {
    const state = this.guilds.get(guildId);
    if (!state) {
      return false;
    }

    return state.player.state.status === AudioPlayerStatus.Playing;
  }

  /**
   * Get current queue size (does not include currently playing item)
   */
  getQueueSize(guildId: string): number {
    const state = this.guilds.get(guildId);
    if (!state) {
      return 0;
    }

    return state.queue.size();
  }

  /**
   * Get playback statistics for a guild
   */
  getStats(guildId: string): PlaybackStats | undefined {
    const state = this.guilds.get(guildId);
    return state?.stats;
  }

  /**
   * Handle user starting to speak (for barge-in detection)
   */
  onUserSpeechStart(guildId: string, userId: string): void {
    const state = this.guilds.get(guildId);
    if (!state) {
      return;
    }

    state.bargeInDetector.onUserSpeechStart(userId);
  }

  /**
   * Handle user stopping speech
   */
  onUserSpeechStop(guildId: string, userId: string): void {
    const state = this.guilds.get(guildId);
    if (!state) {
      return;
    }

    state.bargeInDetector.onUserSpeechStop(userId);
  }

  /**
   * Destroy all players and clean up
   */
  destroy(): void {
    for (const [guildId, state] of this.guilds) {
      state.player.stop();
      state.queue.clear();
      state.bargeInDetector.reset();
    }
    this.guilds.clear();
  }

  /**
   * Play a specific audio segment
   */
  private playSegment(guildId: string, segment: AudioSegment): void {
    const state = this.guilds.get(guildId);
    if (!state) {
      return;
    }

    const { player, bargeInDetector, stats } = state;

    // Create audio resource
    const resource = this.createResource(segment);

    // Update state
    state.currentSegment = segment;
    state.isPlayingSegment = true;

    // Track TTS latency if timestamp provided
    if (segment.requestedAt) {
      const latency = Date.now() - segment.requestedAt;
      const totalSamples = stats.totalPlayed + 1;
      stats.averageTTSLatency =
        (stats.averageTTSLatency * stats.totalPlayed + latency) / totalSamples;
    }

    // Start playing
    player.play(resource);
    bargeInDetector.startPlayback();

    this.emit("playbackStarted", guildId, segment);
  }

  /**
   * Create AudioResource from segment data
   */
  private createResource(segment: AudioSegment): AudioResource {
    let input: Buffer | Readable;

    if (Buffer.isBuffer(segment.data)) {
      // Convert buffer to stream
      input = Readable.from(segment.data);
    } else {
      input = segment.data;
    }

    return createAudioResource(input, {
      inputType: StreamType.Raw,
    });
  }

  /**
   * Handle player state transitions
   */
  private handlePlayerStateChange(
    guildId: string,
    oldState: AudioPlayerState,
    newState: AudioPlayerState,
  ): void {
    const state = this.guilds.get(guildId);
    if (!state) {
      return;
    }

    const { player, queue, bargeInDetector, stats } = state;

    // Track when playback finishes
    if (
      oldState.status === AudioPlayerStatus.Playing &&
      newState.status === AudioPlayerStatus.Idle
    ) {
      bargeInDetector.stopPlayback();
      stats.totalPlayed++;
      state.currentSegment = undefined;
      state.isPlayingSegment = false;

      this.emit("playbackFinished", guildId);

      // Play next item if available
      const nextItem = queue.dequeue();
      if (nextItem) {
        this.playSegment(guildId, nextItem.segment);
      } else {
        // Queue is empty and nothing playing
        this.emit("queueEmpty", guildId);
      }
    }
  }

  /**
   * Handle barge-in interruption
   */
  private handleBargeIn(guildId: string, userId: string): void {
    const state = this.guilds.get(guildId);
    if (!state) {
      return;
    }

    // Stop playback
    state.player.stop();
    state.queue.clear();
    state.stats.interruptionCount++;
    state.isPlayingSegment = false;

    this.emit("bargeIn", guildId, userId);
  }
}
