// ABOUTME: Manages per-user audio stream subscriptions from Discord voice connections
// ABOUTME: Coordinates AudioBuffer and SpeakerTracker, emits audio and speaking events

import { EventEmitter } from "events";
import type { VoiceConnection } from "@discordjs/voice";
import { EndBehaviorType } from "@discordjs/voice";
import type { Readable } from "stream";

import { AudioBuffer } from "./audio-buffer.js";
import { SpeakerTracker } from "./speaker-tracker.js";
import type {
  AudioInputEvents,
  AudioInputConfig,
  AudioPacket,
  WindowOptions,
} from "./types.js";
import { DEFAULT_AUDIO_INPUT_CONFIG } from "./types.js";

interface UserSubscription {
  stream: Readable;
  buffer: AudioBuffer;
}

export class AudioInputManager extends EventEmitter {
  private connection: VoiceConnection;
  private config: Required<Omit<AudioInputConfig, "capacity">> & {
    capacity?: number;
  };
  private subscriptions = new Map<string, UserSubscription>();
  private speakerTracker: SpeakerTracker;
  private autoSubscribe: boolean = false;
  private destroyed: boolean = false;

  // Event listener cleanup
  private boundSpeakingStartHandler: ((userId: string) => void) | null = null;
  private boundSpeakingEndHandler: ((userId: string) => void) | null = null;
  private boundConnectionDestroyHandler: (() => void) | null = null;

  constructor(connection: VoiceConnection, config: AudioInputConfig = {}) {
    super();
    this.connection = connection;
    this.config = { ...DEFAULT_AUDIO_INPUT_CONFIG, ...config };
    this.speakerTracker = new SpeakerTracker();

    // Forward speaking events from tracker
    this.speakerTracker.on("speakingStart", (userId) => {
      this.emit("speakingStart", userId);
    });

    this.speakerTracker.on("speakingStop", (userId, duration) => {
      this.emit("speakingStop", userId, duration);
    });

    // Clean up on connection destroy
    this.boundConnectionDestroyHandler =
      this.handleConnectionDestroy.bind(this);
    this.connection.on("stateChange", (oldState, newState) => {
      if (newState.status === "destroyed") {
        this.handleConnectionDestroy();
      }
    });
  }

  /**
   * Subscribe to a specific user's audio stream
   */
  subscribe(userId: string): void {
    if (this.destroyed) {
      return;
    }

    if (this.subscriptions.has(userId)) {
      return; // Already subscribed
    }

    const receiver = this.connection.receiver;

    // Subscribe to user's audio stream
    const stream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 100,
      },
    });

    // Create buffer for this user
    const buffer = new AudioBuffer(this.config);

    this.subscriptions.set(userId, { stream, buffer });

    // Handle audio data
    stream.on("data", (chunk: Buffer) => {
      if (this.destroyed) {
        return;
      }

      const timestamp = Date.now();
      buffer.push(chunk, timestamp);
      this.emit("audio", userId, chunk, timestamp);
    });

    // Handle stream end
    stream.on("end", () => {
      if (this.destroyed) {
        return;
      }

      this.speakerTracker.stopSpeaking(userId);

      // If auto-subscribing, we'll resubscribe on next speaking event
      if (!this.autoSubscribe) {
        this.unsubscribe(userId);
      }
    });

    // Handle stream errors
    stream.on("error", (error: Error) => {
      if (this.destroyed) {
        return;
      }

      try {
        this.emit("error", error);
      } catch (e) {
        // If error handler throws, don't crash
        console.error("Error in error handler:", e);
      }
    });
  }

  /**
   * Unsubscribe from a user's audio stream
   */
  unsubscribe(userId: string): void {
    const subscription = this.subscriptions.get(userId);

    if (!subscription) {
      return;
    }

    // Clean up stream
    subscription.stream.destroy();

    // Clear buffer
    subscription.buffer.clear();

    // Remove subscription
    this.subscriptions.delete(userId);

    // Clean up speaker tracker
    this.speakerTracker.clearUser(userId);
  }

  /**
   * Subscribe to all users who start speaking
   * Automatically subscribes when users begin speaking
   */
  subscribeAll(): void {
    if (this.destroyed) {
      return;
    }

    this.autoSubscribe = true;

    const receiver = this.connection.receiver;

    // Handle speaking start events
    this.boundSpeakingStartHandler = (userId: string) => {
      if (this.destroyed) {
        return;
      }

      // Get SSRC from receiver ssrcMap - it's updated when the user starts speaking
      // SSRCMap.get() accepts userId and returns VoiceUserData with audioSSRC
      let ssrc = 0;
      const userData = receiver.ssrcMap.get(userId);
      if (userData?.audioSSRC) {
        ssrc = userData.audioSSRC;
        // Also update our tracker
        this.speakerTracker.setUserIdForSsrc(ssrc, userId);
      }

      this.speakerTracker.startSpeaking(userId, ssrc);
      this.subscribe(userId);
    };

    // Handle speaking end events
    this.boundSpeakingEndHandler = (userId: string) => {
      if (this.destroyed) {
        return;
      }

      this.speakerTracker.stopSpeaking(userId);
    };

    receiver.speaking.on("start", this.boundSpeakingStartHandler);
    receiver.speaking.on("end", this.boundSpeakingEndHandler);

    // Listen for SSRC mapping updates from receiver
    receiver.ssrcMap.on(
      "create",
      (data: { audioSSRC: number; userId: string }) => {
        if (!this.destroyed && data.audioSSRC && data.userId) {
          this.speakerTracker.setUserIdForSsrc(data.audioSSRC, data.userId);
        }
      },
    );

    receiver.ssrcMap.on(
      "update",
      (_oldData: unknown, newData: { audioSSRC: number; userId: string }) => {
        if (!this.destroyed && newData.audioSSRC && newData.userId) {
          this.speakerTracker.setUserIdForSsrc(
            newData.audioSSRC,
            newData.userId,
          );
        }
      },
    );
  }

  /**
   * Stop auto-subscribing to new speakers
   */
  stopSubscribeAll(): void {
    this.autoSubscribe = false;

    const receiver = this.connection.receiver;

    if (this.boundSpeakingStartHandler) {
      receiver.speaking.off("start", this.boundSpeakingStartHandler);
      this.boundSpeakingStartHandler = null;
    }

    if (this.boundSpeakingEndHandler) {
      receiver.speaking.off("end", this.boundSpeakingEndHandler);
      this.boundSpeakingEndHandler = null;
    }
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
  getBufferedAudio(userId: string, options?: WindowOptions): AudioPacket[] {
    const subscription = this.subscriptions.get(userId);

    if (!subscription) {
      return [];
    }

    if (options) {
      return subscription.buffer.getWindow(options);
    }

    return subscription.buffer.getAll();
  }

  /**
   * Clear buffer for a specific user
   */
  clearBuffer(userId: string): void {
    const subscription = this.subscriptions.get(userId);

    if (subscription) {
      subscription.buffer.clear();
    }
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
   * Get userId for an SSRC
   */
  getUserIdForSsrc(ssrc: number): string | undefined {
    return this.speakerTracker.getUserIdForSsrc(ssrc);
  }

  /**
   * Clean up all subscriptions and resources
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    // Stop auto-subscribing
    this.stopSubscribeAll();

    // Unsubscribe from all users
    for (const userId of Array.from(this.subscriptions.keys())) {
      this.unsubscribe(userId);
    }

    // Clear speaker tracker
    this.speakerTracker.clear();

    // Remove all listeners
    this.removeAllListeners();
    this.speakerTracker.removeAllListeners();

    this.emit("destroyed");
  }

  private handleConnectionDestroy(): void {
    this.destroy();
  }
}
