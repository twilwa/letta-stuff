// ABOUTME: Audio input module exports and AudioInputManager
// ABOUTME: Handles per-user audio streams, speaker tracking, and buffering

import { EventEmitter } from "events";
import type { VoiceConnection } from "@discordjs/voice";
import { AudioBuffer } from "./audio-buffer.js";
import { SpeakerTracker } from "./speaker-tracker.js";
import type { AudioInputConfig, AudioPacket } from "./types.js";

export { AudioBuffer } from "./audio-buffer.js";
export { SpeakerTracker } from "./speaker-tracker.js";
export type {
  AudioInputConfig,
  AudioInputEvents,
  AudioPacket,
  WindowOptions,
} from "./types.js";

interface UserSubscription {
  buffer: AudioBuffer;
  stream?: any;
}

export class AudioInputManager extends EventEmitter {
  private connection: VoiceConnection;
  private config: AudioInputConfig;
  private subscriptions: Map<string, UserSubscription> = new Map();
  private speakerTracker: SpeakerTracker;
  private subscribeAllMode: boolean = false;
  private destroyed: boolean = false;

  constructor(connection: VoiceConnection, config: AudioInputConfig = {}) {
    super();
    this.connection = connection;
    this.config = config;
    this.speakerTracker = new SpeakerTracker();

    // Forward speaker events
    this.speakerTracker.on("speakingStart", (userId: string) => {
      if (!this.destroyed) {
        this.emit("speakingStart", userId);
      }
    });

    this.speakerTracker.on(
      "speakingStop",
      (userId: string, duration: number) => {
        if (!this.destroyed) {
          this.emit("speakingStop", userId, duration);
          if (this.subscribeAllMode) {
            // Auto-unsubscribe when user stops in subscribeAll mode
            this.unsubscribe(userId);
          }
        }
      },
    );

    // Listen for connection destroy
    connection.on("destroyed" as any, () => {
      this.destroy();
    });

    // Set up receiver speaking event listener
    this.setupReceiverListeners();
  }

  private setupReceiverListeners(): void {
    const receiver = (this.connection as any).receiver;
    if (!receiver) return;

    receiver.speaking?.on("start", (userId: string) => {
      // Get SSRC from receiver if available
      const ssrc = receiver.ssrcMap?.get(userId) ?? 0;
      this.speakerTracker.startSpeaking(userId, ssrc);

      if (this.subscribeAllMode && !this.subscriptions.has(userId)) {
        this.subscribe(userId);
      }
    });

    receiver.speaking?.on("end", (userId: string) => {
      this.speakerTracker.stopSpeaking(userId);
    });
  }

  /**
   * Subscribe to a specific user's audio stream
   */
  subscribe(userId: string): void {
    if (this.subscriptions.has(userId)) {
      return;
    }

    const buffer = new AudioBuffer(this.config);
    const subscription: UserSubscription = { buffer };

    const receiver = (this.connection as any).receiver;
    if (receiver?.subscribe) {
      const stream = receiver.subscribe(userId, { end: { behavior: 1 } });
      subscription.stream = stream;

      stream.on("data", (chunk: Buffer) => {
        if (!this.destroyed) {
          const timestamp = Date.now();
          buffer.push(chunk, timestamp);
          this.emit("audio", userId, chunk, timestamp);
        }
      });

      stream.on("end", () => {
        this.speakerTracker.stopSpeaking(userId);
      });

      stream.on("error", (error: Error) => {
        if (!this.destroyed) {
          this.emit("error", error);
        }
      });
    }

    this.subscriptions.set(userId, subscription);
  }

  /**
   * Unsubscribe from a user's audio stream
   */
  unsubscribe(userId: string): void {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return;
    }

    subscription.buffer.clear();
    this.subscriptions.delete(userId);
    this.speakerTracker.clearUser(userId);
  }

  /**
   * Auto-subscribe to all speaking users
   */
  subscribeAll(): void {
    this.subscribeAllMode = true;
  }

  /**
   * Stop auto-subscribing to all users
   */
  stopSubscribeAll(): void {
    this.subscribeAllMode = false;
  }

  /**
   * Check if subscribed to a user
   */
  isSubscribed(userId: string): boolean {
    return this.subscriptions.has(userId);
  }

  /**
   * Get buffered audio for a user
   */
  getBufferedAudio(userId: string): AudioPacket[] {
    const subscription = this.subscriptions.get(userId);
    return subscription?.buffer.getAll() ?? [];
  }

  /**
   * Clear buffer for a user
   */
  clearBuffer(userId: string): void {
    const subscription = this.subscriptions.get(userId);
    subscription?.buffer.clear();
  }

  /**
   * Check if floor is open (no one speaking)
   */
  isFloorOpen(): boolean {
    return this.speakerTracker.isFloorOpen();
  }

  /**
   * Get current speakers
   */
  getCurrentSpeakers(): string[] {
    return this.speakerTracker.getCurrentSpeakers();
  }

  /**
   * Get userId for SSRC
   */
  getUserIdForSsrc(ssrc: number): string | undefined {
    return this.speakerTracker.getUserIdForSsrc(ssrc);
  }

  /**
   * Destroy manager and clean up all resources
   */
  destroy(): void {
    this.destroyed = true;

    for (const userId of this.subscriptions.keys()) {
      this.unsubscribe(userId);
    }

    this.subscriptions.clear();
    this.speakerTracker.clear();
    this.removeAllListeners();
  }
}
