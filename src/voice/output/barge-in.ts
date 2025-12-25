// ABOUTME: BargeInDetector monitors user speech during bot playback
// ABOUTME: Detects interruptions with configurable sensitivity and cooldown

import { EventEmitter } from "events";
import type { BargeInConfig } from "./types.js";
import { DEFAULT_BARGE_IN_CONFIG } from "./types.js";

export interface BargeInDetectorEvents {
  bargeIn: (userId: string) => void;
}

export class BargeInDetector extends EventEmitter {
  private config: Required<BargeInConfig>;
  private playing: boolean = false;
  private cooldownUntil: number = 0;
  private pendingBargeIns: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<BargeInConfig> = {}) {
    super();
    this.config = { ...DEFAULT_BARGE_IN_CONFIG, ...config };
  }

  /**
   * Notify detector that playback has started
   * Clears cooldown period as new playback starts
   */
  startPlayback(): void {
    this.playing = true;
    // Clear cooldown when starting new playback
    this.cooldownUntil = 0;
  }

  /**
   * Notify detector that playback has stopped
   */
  stopPlayback(): void {
    this.playing = false;
    // Only set cooldown if configured
    if (this.config.cooldownAfterSpeaking > 0) {
      this.cooldownUntil = Date.now() + this.config.cooldownAfterSpeaking;
    }
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Handle user starting to speak
   */
  onUserSpeechStart(userId: string): void {
    if (!this.config.enabled) {
      return;
    }

    // Don't trigger during cooldown
    if (Date.now() < this.cooldownUntil) {
      return;
    }

    // Only trigger if we're actually playing
    if (!this.playing) {
      return;
    }

    // If minimum duration is required, set up delayed trigger
    if (this.config.minSpeechDuration > 0) {
      const timeout = setTimeout(() => {
        this.pendingBargeIns.delete(userId);
        if (this.playing) {
          this.emit("bargeIn", userId);
        }
      }, this.config.minSpeechDuration);

      this.pendingBargeIns.set(userId, timeout);
    } else {
      // Immediate trigger
      this.emit("bargeIn", userId);
    }
  }

  /**
   * Handle user stopping speech
   */
  onUserSpeechStop(userId: string): void {
    // Cancel pending barge-in if speech stopped before minimum duration
    const pending = this.pendingBargeIns.get(userId);
    if (pending) {
      clearTimeout(pending);
      this.pendingBargeIns.delete(userId);
    }
  }

  /**
   * Reset detector state and clear pending timers
   */
  reset(): void {
    this.playing = false;
    this.cooldownUntil = 0;

    // Clear all pending timers
    for (const timeout of this.pendingBargeIns.values()) {
      clearTimeout(timeout);
    }
    this.pendingBargeIns.clear();
  }
}
