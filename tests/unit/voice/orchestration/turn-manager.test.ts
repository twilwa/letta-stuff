// ABOUTME: Unit tests for TurnManager
// ABOUTME: Tests speaker tracking, floor detection, and turn budgeting

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TurnManager, TurnManagerConfig } from "../../../../src/voice/orchestration/turn-manager";

describe("TurnManager", () => {
  let turnManager: TurnManager;

  beforeEach(() => {
    vi.useFakeTimers();
    turnManager = new TurnManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("speaker tracking", () => {
    it("should track when a user starts speaking", () => {
      turnManager.userStartedSpeaking("user-123");
      
      expect(turnManager.getActiveSpeakers()).toContain("user-123");
      expect(turnManager.isSpeaking("user-123")).toBe(true);
    });

    it("should track when a user stops speaking", () => {
      turnManager.userStartedSpeaking("user-123");
      turnManager.userStoppedSpeaking("user-123");
      
      expect(turnManager.getActiveSpeakers()).not.toContain("user-123");
      expect(turnManager.isSpeaking("user-123")).toBe(false);
    });

    it("should track multiple simultaneous speakers", () => {
      turnManager.userStartedSpeaking("user-1");
      turnManager.userStartedSpeaking("user-2");
      turnManager.userStartedSpeaking("user-3");
      
      expect(turnManager.getActiveSpeakers()).toHaveLength(3);
      expect(turnManager.getActiveSpeakers()).toContain("user-1");
      expect(turnManager.getActiveSpeakers()).toContain("user-2");
      expect(turnManager.getActiveSpeakers()).toContain("user-3");
    });

    it("should ignore duplicate start events", () => {
      turnManager.userStartedSpeaking("user-123");
      turnManager.userStartedSpeaking("user-123");
      
      expect(turnManager.getActiveSpeakers()).toHaveLength(1);
    });

    it("should ignore stop events for non-speaking users", () => {
      turnManager.userStoppedSpeaking("user-123");
      
      expect(turnManager.getActiveSpeakers()).toHaveLength(0);
    });
  });

  describe("floor detection", () => {
    it("should report floor as open when no one is speaking", () => {
      expect(turnManager.isFloorOpen()).toBe(true);
    });

    it("should report floor as closed when someone is speaking", () => {
      turnManager.userStartedSpeaking("user-123");
      
      expect(turnManager.isFloorOpen()).toBe(false);
    });

    it("should report floor as open after speaker stops", () => {
      turnManager.userStartedSpeaking("user-123");
      turnManager.userStoppedSpeaking("user-123");
      
      expect(turnManager.isFloorOpen()).toBe(true);
    });

    it("should report floor as closed with any active speakers", () => {
      turnManager.userStartedSpeaking("user-1");
      turnManager.userStartedSpeaking("user-2");
      turnManager.userStoppedSpeaking("user-1");
      
      expect(turnManager.isFloorOpen()).toBe(false);
    });
  });

  describe("bot speaking state", () => {
    it("should track when bot starts speaking", () => {
      turnManager.botStartedSpeaking();
      
      expect(turnManager.isBotSpeaking()).toBe(true);
    });

    it("should track when bot stops speaking", () => {
      turnManager.botStartedSpeaking();
      turnManager.botStoppedSpeaking();
      
      expect(turnManager.isBotSpeaking()).toBe(false);
    });

    it("should report floor as closed when bot is speaking", () => {
      turnManager.botStartedSpeaking();
      
      expect(turnManager.isFloorOpen()).toBe(false);
    });
  });

  describe("cooldown period", () => {
    it("should apply cooldown after bot stops speaking", () => {
      const config: TurnManagerConfig = { cooldownMs: 2000 };
      turnManager = new TurnManager(config);
      
      turnManager.botStartedSpeaking();
      turnManager.botStoppedSpeaking();
      
      expect(turnManager.isInCooldown()).toBe(true);
      expect(turnManager.canBotSpeak()).toBe(false);
    });

    it("should exit cooldown after configured time", () => {
      const config: TurnManagerConfig = { cooldownMs: 2000 };
      turnManager = new TurnManager(config);
      
      turnManager.botStartedSpeaking();
      turnManager.botStoppedSpeaking();
      
      vi.advanceTimersByTime(2001);
      
      expect(turnManager.isInCooldown()).toBe(false);
      expect(turnManager.canBotSpeak()).toBe(true);
    });

    it("should reset cooldown if bot speaks again", () => {
      const config: TurnManagerConfig = { cooldownMs: 2000 };
      turnManager = new TurnManager(config);
      
      turnManager.botStartedSpeaking();
      turnManager.botStoppedSpeaking();
      
      vi.advanceTimersByTime(1000);
      
      turnManager.botStartedSpeaking();
      turnManager.botStoppedSpeaking();
      
      vi.advanceTimersByTime(1500);
      
      expect(turnManager.isInCooldown()).toBe(true);
    });
  });

  describe("canBotSpeak decision", () => {
    it("should allow bot to speak when floor is open and not in cooldown", () => {
      expect(turnManager.canBotSpeak()).toBe(true);
    });

    it("should not allow bot to speak when floor is closed", () => {
      turnManager.userStartedSpeaking("user-123");
      
      expect(turnManager.canBotSpeak()).toBe(false);
    });

    it("should not allow bot to speak when bot is already speaking", () => {
      turnManager.botStartedSpeaking();
      
      expect(turnManager.canBotSpeak()).toBe(false);
    });

    it("should not allow bot to speak during cooldown", () => {
      const config: TurnManagerConfig = { cooldownMs: 2000 };
      turnManager = new TurnManager(config);
      
      turnManager.botStartedSpeaking();
      turnManager.botStoppedSpeaking();
      
      expect(turnManager.canBotSpeak()).toBe(false);
    });
  });

  describe("last speaker tracking", () => {
    it("should track the last user who spoke", () => {
      turnManager.userStartedSpeaking("user-123");
      turnManager.userStoppedSpeaking("user-123");
      
      expect(turnManager.getLastSpeaker()).toBe("user-123");
    });

    it("should update last speaker when new user speaks", () => {
      turnManager.userStartedSpeaking("user-1");
      turnManager.userStoppedSpeaking("user-1");
      turnManager.userStartedSpeaking("user-2");
      turnManager.userStoppedSpeaking("user-2");
      
      expect(turnManager.getLastSpeaker()).toBe("user-2");
    });

    it("should return null if no one has spoken", () => {
      expect(turnManager.getLastSpeaker()).toBeNull();
    });
  });
});
