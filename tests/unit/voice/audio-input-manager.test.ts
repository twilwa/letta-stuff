// ABOUTME: Tests for AudioInputManager class
// ABOUTME: Verifies audio stream subscription, event handling, and lifecycle management

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventEmitter } from "events";
import { PassThrough } from "stream";
import { AudioInputManager } from "../../../src/voice/input/index.js";
import { createOpusPacket } from "./fixtures/opus.js";

// Mock VoiceConnection and VoiceReceiver
class MockAudioReceiveStream extends PassThrough {
  constructor() {
    super();
  }
}

class MockVoiceReceiver extends EventEmitter {
  public speaking = new EventEmitter();
  public ssrcMap = new Map<number, string>();
  private streams = new Map<string, MockAudioReceiveStream>();

  subscribe(userId: string, options?: any): MockAudioReceiveStream {
    let stream = this.streams.get(userId);
    if (!stream) {
      stream = new MockAudioReceiveStream();
      this.streams.set(userId, stream);
    }
    return stream;
  }

  getStream(userId: string): MockAudioReceiveStream | undefined {
    return this.streams.get(userId);
  }

  simulateSpeakingStart(userId: string, ssrc: number): void {
    this.ssrcMap.set(ssrc, userId);
    this.speaking.emit("start", userId);
  }

  simulateSpeakingEnd(userId: string): void {
    this.speaking.emit("end", userId);
  }

  simulateAudioData(userId: string, packet: Buffer): void {
    const stream = this.streams.get(userId);
    if (stream) {
      stream.write(packet);
    }
  }

  simulateStreamEnd(userId: string): void {
    const stream = this.streams.get(userId);
    if (stream) {
      stream.end();
    }
  }
}

class MockVoiceConnection extends EventEmitter {
  public receiver: MockVoiceReceiver;

  constructor() {
    super();
    this.receiver = new MockVoiceReceiver();
  }

  destroy(): void {
    // Emit synchronously
    this.emit("stateChange", { status: "connected" }, { status: "destroyed" });
  }
}

describe("AudioInputManager", () => {
  let connection: MockVoiceConnection;
  let manager: AudioInputManager;

  beforeEach(() => {
    connection = new MockVoiceConnection();
    manager = new AudioInputManager(connection as any);
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("Construction", () => {
    it("should create manager with default config", () => {
      expect(manager).toBeDefined();
    });

    it("should create manager with custom config", () => {
      const customManager = new AudioInputManager(connection as any, {
        bufferSeconds: 10,
        frameDurationMs: 40,
      });

      expect(customManager).toBeDefined();
      customManager.destroy();
    });
  });

  describe("Single user subscription", () => {
    it("should subscribe to specific user audio", () => {
      const userId = "user123";

      manager.subscribe(userId);

      // Subscription should be active
      expect(manager.isSubscribed(userId)).toBe(true);
    });

    it("should emit audio event when user sends audio", () => {
      return new Promise<void>((resolve) => {
        const userId = "user123";
        const packet = createOpusPacket();

        manager.on("audio", (receivedUserId, receivedPacket) => {
          expect(receivedUserId).toBe(userId);
          expect(receivedPacket).toEqual(packet);
          resolve();
        });

        manager.subscribe(userId);
        connection.receiver.simulateAudioData(userId, packet);
      });
    });

    it("should buffer audio packets per user", () => {
      const userId = "user123";
      const packets = [
        createOpusPacket(),
        createOpusPacket(),
        createOpusPacket(),
      ];

      manager.subscribe(userId);

      packets.forEach((p) => connection.receiver.simulateAudioData(userId, p));

      const buffered = manager.getBufferedAudio(userId);
      expect(buffered.length).toBe(3);
    });

    it("should handle stream end event", () => {
      return new Promise<void>((resolve) => {
        const userId = "user123";

        manager.on("speakingStop", (receivedUserId) => {
          expect(receivedUserId).toBe(userId);
          resolve();
        });

        manager.subscribe(userId);
        connection.receiver.simulateSpeakingStart(userId, 12345);
        connection.receiver.simulateStreamEnd(userId);
      });
    });

    it("should not subscribe to same user twice", () => {
      const userId = "user123";

      manager.subscribe(userId);
      manager.subscribe(userId);

      expect(manager.isSubscribed(userId)).toBe(true);
    });

    it("should unsubscribe from user", () => {
      const userId = "user123";

      manager.subscribe(userId);
      expect(manager.isSubscribed(userId)).toBe(true);

      manager.unsubscribe(userId);
      expect(manager.isSubscribed(userId)).toBe(false);
    });
  });

  describe("Subscribe all", () => {
    it("should auto-subscribe when users start speaking", () => {
      return new Promise<void>((resolve) => {
        const userId = "user123";

        manager.subscribeAll();

        // Give a small delay to allow subscription to complete
        setTimeout(() => {
          if (manager.isSubscribed(userId)) {
            resolve();
          }
        }, 10);

        connection.receiver.simulateSpeakingStart(userId, 12345);
      });
    });

    it("should handle multiple concurrent speakers", async () => {
      const startHandler = vi.fn();
      manager.on("speakingStart", startHandler);

      manager.subscribeAll();

      connection.receiver.simulateSpeakingStart("user1", 111);
      connection.receiver.simulateSpeakingStart("user2", 222);
      connection.receiver.simulateSpeakingStart("user3", 333);

      // Wait for subscriptions to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(startHandler).toHaveBeenCalledTimes(3);
      expect(manager.isSubscribed("user1")).toBe(true);
      expect(manager.isSubscribed("user2")).toBe(true);
      expect(manager.isSubscribed("user3")).toBe(true);
    });

    it("should handle speaking stop", () => {
      return new Promise<void>((resolve) => {
        const userId = "user123";

        manager.subscribeAll();

        connection.receiver.simulateSpeakingStart(userId, 12345);

        manager.on("speakingStop", (receivedUserId) => {
          expect(receivedUserId).toBe(userId);
          resolve();
        });

        connection.receiver.simulateSpeakingEnd(userId);
      });
    });

    it("should stop auto-subscribing after stopSubscribeAll", async () => {
      manager.subscribeAll();

      // Wait a bit then stop
      await new Promise((resolve) => setTimeout(resolve, 10));
      manager.stopSubscribeAll();

      const startHandler = vi.fn();
      const subscribeHandler = vi.fn();

      // Listen for events but not for subscription
      manager.on("speakingStart", startHandler);

      // Check subscription state
      const userId = "user456";
      connection.receiver.simulateSpeakingStart(userId, 54321);

      // Wait to ensure handler isn't called and subscription doesn't happen
      await new Promise((resolve) => setTimeout(resolve, 10));

      // The speakingStart event might still fire from the tracker,
      // but subscription shouldn't happen
      expect(manager.isSubscribed(userId)).toBe(false);
    });
  });

  describe("Speaker tracking integration", () => {
    it("should emit speakingStart event", () => {
      return new Promise<void>((resolve) => {
        const userId = "user123";

        manager.on("speakingStart", (receivedUserId) => {
          expect(receivedUserId).toBe(userId);
          resolve();
        });

        manager.subscribeAll();
        connection.receiver.simulateSpeakingStart(userId, 12345);
      });
    });

    it("should emit speakingStop with duration", async () => {
      const userId = "user123";

      const promise = new Promise<void>((resolve) => {
        manager.on("speakingStop", (receivedUserId, duration) => {
          expect(receivedUserId).toBe(userId);
          expect(duration).toBeGreaterThanOrEqual(0);
          resolve();
        });
      });

      manager.subscribeAll();
      connection.receiver.simulateSpeakingStart(userId, 12345);

      await new Promise((resolve) => setTimeout(resolve, 10));
      connection.receiver.simulateSpeakingEnd(userId);

      return promise;
    });

    it("should track floor state", async () => {
      expect(manager.isFloorOpen()).toBe(true);

      manager.subscribeAll();

      connection.receiver.simulateSpeakingStart("user123", 12345);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(manager.isFloorOpen()).toBe(false);

      connection.receiver.simulateSpeakingEnd("user123");

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(manager.isFloorOpen()).toBe(true);
    });

    it("should get current speakers", async () => {
      manager.subscribeAll();

      connection.receiver.simulateSpeakingStart("user1", 111);
      connection.receiver.simulateSpeakingStart("user2", 222);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const speakers = manager.getCurrentSpeakers();

      expect(speakers).toContain("user1");
      expect(speakers).toContain("user2");
      expect(speakers.length).toBe(2);
    });
  });

  describe("SSRC mapping", () => {
    it("should provide SSRC mapping functionality", () => {
      // SSRC mapping is populated when subscribeAll() is used and the Discord
      // receiver provides the SSRC map. This is tested in integration tests
      // with real Discord connections. Here we just verify the API exists.
      const mappedUserId = manager.getUserIdForSsrc(99999);
      expect(mappedUserId).toBeUndefined();
    });
  });

  describe("Buffer management", () => {
    it("should clear buffer for specific user", () => {
      const userId = "user123";

      manager.subscribe(userId);
      connection.receiver.simulateAudioData(userId, createOpusPacket());
      connection.receiver.simulateAudioData(userId, createOpusPacket());

      expect(manager.getBufferedAudio(userId).length).toBe(2);

      manager.clearBuffer(userId);

      expect(manager.getBufferedAudio(userId).length).toBe(0);
    });

    it("should return empty array for unsubscribed user", () => {
      const buffered = manager.getBufferedAudio("unknown");
      expect(buffered).toEqual([]);
    });

    it("should maintain separate buffers per user", () => {
      manager.subscribe("user1");
      manager.subscribe("user2");

      connection.receiver.simulateAudioData("user1", createOpusPacket());
      connection.receiver.simulateAudioData("user2", createOpusPacket());
      connection.receiver.simulateAudioData("user2", createOpusPacket());

      expect(manager.getBufferedAudio("user1").length).toBe(1);
      expect(manager.getBufferedAudio("user2").length).toBe(2);
    });
  });

  describe("Cleanup and lifecycle", () => {
    it("should clean up on user disconnect", () => {
      const userId = "user123";

      manager.subscribe(userId);
      connection.receiver.simulateAudioData(userId, createOpusPacket());
      connection.receiver.simulateSpeakingStart(userId, 12345);

      manager.unsubscribe(userId);

      expect(manager.isSubscribed(userId)).toBe(false);
      expect(manager.getBufferedAudio(userId).length).toBe(0);
    });

    it("should clean up all subscriptions on destroy", () => {
      manager.subscribe("user1");
      manager.subscribe("user2");
      manager.subscribe("user3");

      manager.destroy();

      expect(manager.isSubscribed("user1")).toBe(false);
      expect(manager.isSubscribed("user2")).toBe(false);
      expect(manager.isSubscribed("user3")).toBe(false);
    });

    it("should clean up on connection destroy via destroy() call", () => {
      manager.subscribe("user123");

      // Manually call destroy
      manager.destroy();

      // Manager should have cleaned up
      expect(manager.isSubscribed("user123")).toBe(false);
    });

    it("should remove all event listeners on destroy", () => {
      const audioHandler = vi.fn();
      const speakingHandler = vi.fn();

      manager.on("audio", audioHandler);
      manager.on("speakingStart", speakingHandler);

      manager.destroy();

      connection.receiver.simulateSpeakingStart("user123", 12345);
      connection.receiver.simulateAudioData("user123", createOpusPacket());

      expect(audioHandler).not.toHaveBeenCalled();
      expect(speakingHandler).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should handle stream errors gracefully", () => {
      return new Promise<void>((resolve) => {
        const userId = "user123";

        manager.on("error", (error) => {
          expect(error).toBeDefined();
          resolve();
        });

        manager.subscribe(userId);

        const stream = connection.receiver.getStream(userId);
        if (stream) {
          stream.emit("error", new Error("Stream error"));
        }
      });
    });

    it("should continue working after stream error", () => {
      const userId = "user123";

      manager.subscribe(userId);

      const stream = connection.receiver.getStream(userId);
      if (stream) {
        // Don't throw - emit error event instead
        manager.on("error", () => {
          // Handle error silently in test
        });
        stream.emit("error", new Error("Stream error"));
      }

      // Should still be able to subscribe to other users
      manager.subscribe("user456");
      expect(manager.isSubscribed("user456")).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should handle rapid subscribe/unsubscribe", () => {
      const userId = "user123";

      for (let i = 0; i < 10; i++) {
        manager.subscribe(userId);
        manager.unsubscribe(userId);
      }

      expect(manager.isSubscribed(userId)).toBe(false);
    });

    it("should handle subscribeAll with no speakers", () => {
      manager.subscribeAll();

      expect(manager.getCurrentSpeakers()).toEqual([]);
      expect(manager.isFloorOpen()).toBe(true);
    });

    it("should handle audio data before subscription", () => {
      const userId = "user123";
      const audioHandler = vi.fn();

      manager.on("audio", audioHandler);

      // Audio arrives before subscription
      connection.receiver.simulateAudioData(userId, createOpusPacket());

      expect(audioHandler).not.toHaveBeenCalled();
    });
  });
});
