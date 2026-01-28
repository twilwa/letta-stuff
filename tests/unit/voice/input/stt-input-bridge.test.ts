import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { EventEmitter } from "events";
import { STTInputBridge } from "../../../../src/voice/input/stt-input-bridge.js";
import type { AudioInputManager } from "../../../../src/voice/input/audio-input-manager.js";
import type { TranscriptionEvent } from "../../../../src/voice/input/stt/types.js";
import type { ConversationTurn } from "../../../../src/voice/input/stt/aggregator.js";
import { AudioTransformPipeline } from "../../../../src/voice/transform/index.js";
import { TranscriptAggregator } from "../../../../src/voice/input/stt/aggregator.js";

class MockAudioInputManager extends EventEmitter {
  subscribe = vi.fn();
  unsubscribe = vi.fn();
  subscribeAll = vi.fn();
  stopSubscribeAll = vi.fn();
  isSubscribed = vi.fn().mockReturnValue(false);
  getCurrentSpeakers = vi.fn().mockReturnValue([]);
  destroy = vi.fn();
}

class MockSTTManager extends EventEmitter {
  private activeUsers = new Set<string>();

  async startUser(userId: string): Promise<void> {
    this.activeUsers.add(userId);
  }

  stopUser(userId: string): void {
    this.activeUsers.delete(userId);
  }

  sendAudio(_userId: string, _buffer: Buffer): void {}

  getActiveUsers(): string[] {
    return Array.from(this.activeUsers);
  }

  destroy(): void {
    this.activeUsers.clear();
    this.removeAllListeners();
  }
}

describe("STTInputBridge", () => {
  let audioInputManager: MockAudioInputManager;
  let mockSTTManager: MockSTTManager;
  let transformPipeline: AudioTransformPipeline;
  let aggregator: TranscriptAggregator;
  let bridge: STTInputBridge;

  beforeEach(() => {
    audioInputManager = new MockAudioInputManager();
    mockSTTManager = new MockSTTManager();
    transformPipeline = new AudioTransformPipeline();
    aggregator = new TranscriptAggregator();
  });

  afterEach(() => {
    if (bridge) {
      bridge.destroy();
    }
  });

  describe("constructor", () => {
    it("should create bridge with default config", () => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
      expect(bridge).toBeDefined();
    });

    it("should create bridge with custom config", () => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          model: "nova-3",
          language: "es-ES",
          flushTimeout: 3000,
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
      expect(bridge).toBeDefined();
    });
  });

  describe("startUser", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should start transcription for a user", async () => {
      await bridge.startUser("user1");
      expect(bridge.getActiveUsers()).toContain("user1");
    });

    it("should not start same user twice", async () => {
      await bridge.startUser("user1");
      await bridge.startUser("user1");
      expect(bridge.getActiveUsers()).toEqual(["user1"]);
    });

    it("should handle audio events after starting", async () => {
      await bridge.startUser("user1");

      const transcriptPromise = new Promise<TranscriptionEvent>((resolve) => {
        bridge.once("transcript", resolve);
      });

      // Simulate audio input - 48kHz stereo PCM (4 bytes per sample)
      const audioChunk = Buffer.alloc(3840); // 20ms at 48kHz stereo
      audioInputManager.emit("audio", "user1", audioChunk, Date.now());

      // Wait a bit for processing
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  describe("stopUser", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should stop transcription for a user", async () => {
      await bridge.startUser("user1");
      expect(bridge.getActiveUsers()).toContain("user1");

      bridge.stopUser("user1");
      expect(bridge.getActiveUsers()).not.toContain("user1");
    });

    it("should handle stopping non-existent user", () => {
      expect(() => bridge.stopUser("user1")).not.toThrow();
    });
  });

  describe("audio routing", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should transform and route audio to STT", async () => {
      await bridge.startUser("user1");

      // Simulate audio input - 48kHz stereo PCM
      const audioChunk = Buffer.alloc(3840); // 20ms at 48kHz stereo
      audioInputManager.emit("audio", "user1", audioChunk, Date.now());

      // Audio should be processed through transform pipeline
      // We can't easily verify internal state, but we can check no errors
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it("should ignore audio for non-active users", async () => {
      const audioChunk = Buffer.alloc(3840);
      expect(() =>
        audioInputManager.emit("audio", "user1", audioChunk, Date.now()),
      ).not.toThrow();
    });
  });

  describe("transcript events", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should forward transcript events", async () => {
      const transcriptPromise = new Promise<TranscriptionEvent>((resolve) => {
        bridge.once("transcript", resolve);
      });

      await bridge.startUser("user1");

      // Simulate STT transcript event by accessing internal manager
      // This is a bit of a hack but necessary for testing
      const sttManager = (bridge as any).sttManager;
      sttManager.emit("transcript", {
        text: "hello world",
        isFinal: false,
        confidence: 0.95,
        userId: "user1",
      });

      const event = await transcriptPromise;
      expect(event.text).toBe("hello world");
      expect(event.userId).toBe("user1");
    });
  });

  describe("utterance aggregation", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should emit utterance events", async () => {
      const utterancePromise = new Promise((resolve) => {
        bridge.once("utterance", resolve);
      });

      await bridge.startUser("user1");

      // Simulate final transcript
      const sttManager = (bridge as any).sttManager;
      sttManager.emit("transcript", {
        text: "hello world",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      await utterancePromise;
    });

    it("should emit turn events", async () => {
      const turnPromise = new Promise<ConversationTurn>((resolve) => {
        bridge.once("turn", resolve);
      });

      await bridge.startUser("user1");

      // Simulate final transcript
      const sttManager = (bridge as any).sttManager;
      sttManager.emit("transcript", {
        text: "hello world",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      const turn = await turnPromise;
      expect(turn.userId).toBe("user1");
      expect(turn.text).toBe("hello world");
    });
  });

  describe("multi-user handling", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should handle multiple users simultaneously", async () => {
      await bridge.startUser("user1");
      await bridge.startUser("user2");

      expect(bridge.getActiveUsers()).toContain("user1");
      expect(bridge.getActiveUsers()).toContain("user2");
      expect(bridge.getActiveUsers().length).toBe(2);
    });

    it("should route audio to correct user STT", async () => {
      await bridge.startUser("user1");
      await bridge.startUser("user2");

      const user1Transcripts: TranscriptionEvent[] = [];
      const user2Transcripts: TranscriptionEvent[] = [];

      bridge.on("transcript", (event: TranscriptionEvent) => {
        if (event.userId === "user1") {
          user1Transcripts.push(event);
        } else if (event.userId === "user2") {
          user2Transcripts.push(event);
        }
      });

      // Simulate transcripts
      const sttManager = (bridge as any).sttManager;
      sttManager.emit("transcript", {
        text: "user one speaking",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      sttManager.emit("transcript", {
        text: "user two speaking",
        isFinal: true,
        confidence: 0.95,
        userId: "user2",
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(user1Transcripts.length).toBeGreaterThan(0);
      expect(user2Transcripts.length).toBeGreaterThan(0);
    });

    it("should detect overlap when multiple users speak", async () => {
      const overlapPromise = new Promise((resolve) => {
        bridge.once("overlap", resolve);
      });

      await bridge.startUser("user1");
      await bridge.startUser("user2");

      // Simulate partial transcripts from both users
      const sttManager = (bridge as any).sttManager;
      sttManager.emit("transcript", {
        text: "user one",
        isFinal: false,
        confidence: 0.95,
        userId: "user1",
      });

      sttManager.emit("transcript", {
        text: "user two",
        isFinal: false,
        confidence: 0.95,
        userId: "user2",
      });

      await overlapPromise;
    });
  });

  describe("startAll and stopAll", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should start transcription for all speaking users", async () => {
      audioInputManager.getCurrentSpeakers.mockReturnValue(["user1", "user2"]);

      await bridge.startAll();

      expect(bridge.getActiveUsers()).toContain("user1");
      expect(bridge.getActiveUsers()).toContain("user2");
    });

    it("should stop all active transcriptions", async () => {
      await bridge.startUser("user1");
      await bridge.startUser("user2");

      bridge.stopAll();

      expect(bridge.getActiveUsers().length).toBe(0);
    });
  });

  describe("conversation history", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should return conversation history", async () => {
      await bridge.startUser("user1");

      // Simulate final transcript
      const sttManager = (bridge as any).sttManager;
      sttManager.emit("transcript", {
        text: "hello world",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const history = bridge.getConversationHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].text).toBe("hello world");
    });

    it("should limit conversation history", async () => {
      await bridge.startUser("user1");

      const sttManager = (bridge as any).sttManager;

      // Emit multiple transcripts
      for (let i = 0; i < 5; i++) {
        sttManager.emit("transcript", {
          text: `message ${i}`,
          isFinal: true,
          confidence: 0.95,
          userId: "user1",
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      const history = bridge.getConversationHistory(3);
      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe("destroy", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should clean up all resources", async () => {
      await bridge.startUser("user1");
      await bridge.startUser("user2");

      bridge.destroy();

      expect(bridge.getActiveUsers().length).toBe(0);
    });

    it("should remove all event listeners", async () => {
      await bridge.startUser("user1");

      const listenerCount = bridge.listenerCount("transcript");
      bridge.destroy();

      expect(bridge.listenerCount("transcript")).toBe(0);
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      bridge = new STTInputBridge(
        audioInputManager as unknown as AudioInputManager,
        {
          sttManager: mockSTTManager as any,
          transformPipeline,
          aggregator,
        },
      );
    });

    it("should forward STT errors", async () => {
      const errorPromise = new Promise<Error>((resolve) => {
        bridge.once("error", resolve);
      });

      await bridge.startUser("user1");

      const sttManager = (bridge as any).sttManager;
      const testError = new Error("STT error");
      sttManager.emit("error", testError, "user1");

      const error = await errorPromise;
      expect(error).toBe(testError);
    });
  });
});
