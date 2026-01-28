// ABOUTME: Bridges TTSManager to AudioOutputManager for Discord voice playback
// ABOUTME: Handles text-to-speech synthesis and queuing for voice output

import { EventEmitter } from "events";
import type { TTSManager, TTSMetrics } from "./tts/manager.js";
import type { AudioOutputManager } from "./manager.js";
import type { TTSOptions } from "./tts/types.js";
import type { AudioSegment, PlaybackStats } from "./types.js";

export interface TTSOutputBridgeConfig {
  defaultVoice?: string;
  defaultSpeed?: number;
}

interface TTSOutputBridgeEvents {
  playbackStarted: (guildId: string, segment: AudioSegment) => void;
  playbackFinished: (guildId: string) => void;
  bargeIn: (guildId: string, userId: string) => void;
  error: (guildId: string, error: Error) => void;
}

export declare interface TTSOutputBridge {
  on<K extends keyof TTSOutputBridgeEvents>(
    event: K,
    listener: TTSOutputBridgeEvents[K],
  ): this;
  emit<K extends keyof TTSOutputBridgeEvents>(
    event: K,
    ...args: Parameters<TTSOutputBridgeEvents[K]>
  ): boolean;
}

export class TTSOutputBridge extends EventEmitter {
  private ttsManager: TTSManager;
  private audioOutputManager: AudioOutputManager;
  private config: TTSOutputBridgeConfig;

  constructor(
    ttsManager: TTSManager,
    audioOutputManager: AudioOutputManager,
    config: TTSOutputBridgeConfig = {},
  ) {
    super();
    this.ttsManager = ttsManager;
    this.audioOutputManager = audioOutputManager;
    this.config = config;

    this.setupEventForwarding();
  }

  async speak(
    guildId: string,
    text: string,
    options: TTSOptions = {},
  ): Promise<void> {
    try {
      const segment = await this.ttsManager.synthesize(text, options);

      try {
        this.audioOutputManager.play(guildId, segment);
      } catch (playbackError) {
        if (this.listenerCount("error") > 0) {
          this.emit("error", guildId, playbackError as Error);
        }
        throw playbackError;
      }
    } catch (ttsError) {
      if (this.listenerCount("error") > 0) {
        this.emit("error", guildId, ttsError as Error);
      }
      throw ttsError;
    }
  }

  stop(guildId: string): void {
    this.audioOutputManager.stop(guildId);
  }

  isSpeaking(guildId: string): boolean {
    return this.audioOutputManager.isPlaying(guildId);
  }

  getMetrics(guildId: string): {
    tts: TTSMetrics;
    playback: PlaybackStats | undefined;
  } {
    return {
      tts: this.ttsManager.getMetrics(),
      playback: this.audioOutputManager.getStats(guildId),
    };
  }

  private setupEventForwarding(): void {
    this.audioOutputManager.on("bargeIn", (guildId: string, userId: string) => {
      this.audioOutputManager.stop(guildId);
      this.emit("bargeIn", guildId, userId);
    });

    this.audioOutputManager.on(
      "playbackStarted",
      (guildId: string, segment: AudioSegment) => {
        this.emit("playbackStarted", guildId, segment);
      },
    );

    this.audioOutputManager.on("playbackFinished", (guildId: string) => {
      this.emit("playbackFinished", guildId);
    });

    this.audioOutputManager.on("error", (guildId: string, error: Error) => {
      this.emit("error", guildId, error);
    });
  }
}
