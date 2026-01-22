// ABOUTME: Manages turn-taking in voice conversations
// ABOUTME: Tracks active speakers, floor availability, and bot speaking cooldowns

export interface TurnManagerConfig {
  cooldownMs?: number;
}

const DEFAULT_COOLDOWN_MS = 1000;

export class TurnManager {
  private activeSpeakers: Set<string> = new Set();
  private botSpeaking = false;
  private lastSpeakerId: string | null = null;
  private cooldownEndTime = 0;
  private readonly cooldownMs: number;

  constructor(config: TurnManagerConfig = {}) {
    this.cooldownMs = config.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  }

  userStartedSpeaking(userId: string): void {
    this.activeSpeakers.add(userId);
  }

  userStoppedSpeaking(userId: string): void {
    if (this.activeSpeakers.has(userId)) {
      this.activeSpeakers.delete(userId);
      this.lastSpeakerId = userId;
    }
  }

  getActiveSpeakers(): string[] {
    return Array.from(this.activeSpeakers);
  }

  isSpeaking(userId: string): boolean {
    return this.activeSpeakers.has(userId);
  }

  isFloorOpen(): boolean {
    return this.activeSpeakers.size === 0 && !this.botSpeaking;
  }

  botStartedSpeaking(): void {
    this.botSpeaking = true;
  }

  botStoppedSpeaking(): void {
    this.botSpeaking = false;
    this.cooldownEndTime = Date.now() + this.cooldownMs;
  }

  isBotSpeaking(): boolean {
    return this.botSpeaking;
  }

  isInCooldown(): boolean {
    return Date.now() < this.cooldownEndTime;
  }

  canBotSpeak(): boolean {
    return this.isFloorOpen() && !this.isInCooldown();
  }

  getLastSpeaker(): string | null {
    return this.lastSpeakerId;
  }
}
