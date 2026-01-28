// ABOUTME: Speaker state tracking and SSRC-to-userId mapping
// ABOUTME: Emits speaking events and tracks speaking duration per user

import { EventEmitter } from "events";

interface SpeakerState {
  userId: string;
  ssrc: number;
  startTime: number;
  totalDuration: number;
}

export class SpeakerTracker extends EventEmitter {
  private ssrcToUserId = new Map<number, string>();
  private activeSpeakers = new Map<string, SpeakerState>();
  private speakingDurations = new Map<string, number>();

  /**
   * Mark a user as starting to speak
   */
  startSpeaking(userId: string, ssrc: number): void {
    // Update SSRC mapping
    this.ssrcToUserId.set(ssrc, userId);

    // Don't emit if already speaking
    if (this.activeSpeakers.has(userId)) {
      return;
    }

    const state: SpeakerState = {
      userId,
      ssrc,
      startTime: Date.now(),
      totalDuration: this.speakingDurations.get(userId) ?? 0,
    };

    this.activeSpeakers.set(userId, state);
    this.emit("speakingStart", userId);
  }

  /**
   * Mark a user as stopping speaking
   */
  stopSpeaking(userId: string): void {
    const state = this.activeSpeakers.get(userId);

    if (!state) {
      // User wasn't speaking (or we didn't catch the start)
      return;
    }

    const duration = Date.now() - state.startTime;
    const totalDuration = state.totalDuration + duration;

    this.speakingDurations.set(userId, totalDuration);
    this.activeSpeakers.delete(userId);

    this.emit("speakingStop", userId, duration);
  }

  /**
   * Set SSRC to userId mapping
   */
  setUserIdForSsrc(ssrc: number, userId: string): void {
    this.ssrcToUserId.set(ssrc, userId);
  }

  /**
   * Get userId for an SSRC
   */
  getUserIdForSsrc(ssrc: number): string | undefined {
    return this.ssrcToUserId.get(ssrc);
  }

  /**
   * Clear SSRC mapping
   */
  clearSsrc(ssrc: number): void {
    this.ssrcToUserId.delete(ssrc);
  }

  /**
   * Clear all state for a specific user
   */
  clearUser(userId: string): void {
    const state = this.activeSpeakers.get(userId);

    if (state) {
      // Stop speaking first to calculate duration
      this.stopSpeaking(userId);
    }

    // Clear SSRC mappings for this user
    for (const [ssrc, mappedUserId] of this.ssrcToUserId.entries()) {
      if (mappedUserId === userId) {
        this.ssrcToUserId.delete(ssrc);
      }
    }

    this.speakingDurations.delete(userId);
  }

  /**
   * Check if the floor is open (no one is speaking)
   */
  isFloorOpen(): boolean {
    return this.activeSpeakers.size === 0;
  }

  /**
   * Get array of currently speaking user IDs
   */
  getCurrentSpeakers(): string[] {
    return Array.from(this.activeSpeakers.keys());
  }

  /**
   * Get total speaking duration for a user (in milliseconds)
   * Includes current session if user is still speaking
   */
  getSpeakingDuration(userId: string): number {
    const state = this.activeSpeakers.get(userId);

    if (state) {
      // User is currently speaking, include current session
      const currentDuration = Date.now() - state.startTime;
      return state.totalDuration + currentDuration;
    }

    return this.speakingDurations.get(userId) ?? 0;
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.ssrcToUserId.clear();
    this.activeSpeakers.clear();
    this.speakingDurations.clear();
  }
}
