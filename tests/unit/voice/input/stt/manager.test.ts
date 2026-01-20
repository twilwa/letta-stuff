import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { TranscriptionEvent } from "../../../../../src/voice/input/stt/types.js";

vi.mock("../../../../../src/config/index.js", () => ({
  loadConfig: vi.fn().mockReturnValue({
    stt: { deepgramApiKey: "test-api-key" },
  }),
}));

const { createMockClient, DeepgramSTT, EventEmitter } = vi.hoisted(() => {
  const { EventEmitter } = require("events");

  const createMockClient = () => {
    const mockClient = new EventEmitter();
    (mockClient as any).start = vi.fn().mockResolvedValue(undefined);
    (mockClient as any).stop = vi.fn();
    (mockClient as any).sendAudio = vi.fn();
    (mockClient as any).destroy = vi.fn();
    mockClient.setMaxListeners(20);
    return mockClient;
  };

  const DeepgramSTT = vi.fn().mockImplementation(() => createMockClient());

  return { createMockClient, DeepgramSTT, EventEmitter };
});

vi.mock("../../../../../src/voice/input/stt/deepgram.js", () => ({
  DeepgramSTT,
}));

const { STTManager } =
  await import("../../../../../src/voice/input/stt/manager.js");

describe("STTManager", () => {
  let manager: STTManager;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new STTManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  const getMockClient = () => {
    const calls = DeepgramSTT.mock.results;
    return calls[calls.length - 1]?.value;
  };

  describe("User Lifecycle", () => {
    it("starts STT for a user", async () => {
      await manager.startUser("user1");

      expect(DeepgramSTT).toHaveBeenCalledTimes(1);
      expect(getMockClient().start).toHaveBeenCalledTimes(1);
      expect(manager.getActiveUsers()).toContain("user1");
    });

    it("emits userConnected event when user starts", async () => {
      const userConnectedPromise = new Promise<string>((resolve) => {
        manager.once("userConnected", resolve);
      });

      await manager.startUser("user1");

      const userId = await userConnectedPromise;
      expect(userId).toBe("user1");
    });

    it("stops STT for a user", async () => {
      await manager.startUser("user1");
      const client = getMockClient();
      manager.stopUser("user1");

      expect(client.stop).toHaveBeenCalledTimes(1);
      expect(manager.getActiveUsers()).not.toContain("user1");
    });

    it("emits userDisconnected event when user stops", async () => {
      await manager.startUser("user1");

      const userDisconnectedPromise = new Promise<string>((resolve) => {
        manager.once("userDisconnected", resolve);
      });

      manager.stopUser("user1");

      const userId = await userDisconnectedPromise;
      expect(userId).toBe("user1");
    });

    it("does not start duplicate STT for same user", async () => {
      await manager.startUser("user1");
      await manager.startUser("user1");

      expect(DeepgramSTT).toHaveBeenCalledTimes(1);
    });

    it("handles stopping non-existent user gracefully", () => {
      expect(() => manager.stopUser("nonexistent")).not.toThrow();
    });
  });

  describe("Audio Routing", () => {
    it("routes audio to correct user's STT client", async () => {
      await manager.startUser("user1");
      const client = getMockClient();

      const buffer = Buffer.from("audio data");
      manager.sendAudio("user1", buffer);

      expect(client.sendAudio).toHaveBeenCalledWith(buffer);
    });

    it("ignores audio for non-existent user", () => {
      const buffer = Buffer.from("audio data");
      expect(() => manager.sendAudio("nonexistent", buffer)).not.toThrow();
    });

    it("routes audio to multiple users independently", async () => {
      const mockClient1 = new EventEmitter();
      (mockClient1 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient1 as any).stop = vi.fn();
      (mockClient1 as any).sendAudio = vi.fn();
      (mockClient1 as any).destroy = vi.fn();

      const mockClient2 = new EventEmitter();
      (mockClient2 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient2 as any).stop = vi.fn();
      (mockClient2 as any).sendAudio = vi.fn();
      (mockClient2 as any).destroy = vi.fn();

      DeepgramSTT.mockImplementationOnce(
        () => mockClient1,
      ).mockImplementationOnce(() => mockClient2);

      await manager.startUser("user1");
      await manager.startUser("user2");

      const buffer1 = Buffer.from("audio1");
      const buffer2 = Buffer.from("audio2");

      manager.sendAudio("user1", buffer1);
      manager.sendAudio("user2", buffer2);

      expect(mockClient1.sendAudio).toHaveBeenCalledWith(buffer1);
      expect(mockClient2.sendAudio).toHaveBeenCalledWith(buffer2);
    });
  });

  describe("Transcript Events", () => {
    it("emits transcript event with userId for partial results", async () => {
      await manager.startUser("user1");
      const client = getMockClient();

      const transcriptPromise = new Promise<TranscriptionEvent>((resolve) => {
        manager.once("transcript", resolve);
      });

      client.emit("transcription", {
        text: "hello",
        isFinal: false,
        confidence: 0.85,
      });

      const event = await transcriptPromise;
      expect(event).toEqual({
        text: "hello",
        isFinal: false,
        confidence: 0.85,
        userId: "user1",
      });
    });

    it("emits finalTranscript event with userId for final results", async () => {
      await manager.startUser("user1");
      const client = getMockClient();

      const finalTranscriptPromise = new Promise<TranscriptionEvent>(
        (resolve) => {
          manager.once("finalTranscript", resolve);
        },
      );

      client.emit("transcription", {
        text: "hello world",
        isFinal: true,
        confidence: 0.95,
      });

      const event = await finalTranscriptPromise;
      expect(event).toEqual({
        text: "hello world",
        isFinal: true,
        confidence: 0.95,
        userId: "user1",
      });
    });

    it("emits both transcript and finalTranscript for final results", async () => {
      await manager.startUser("user1");
      const client = getMockClient();

      const transcriptPromise = new Promise<TranscriptionEvent>((resolve) => {
        manager.once("transcript", resolve);
      });

      const finalTranscriptPromise = new Promise<TranscriptionEvent>(
        (resolve) => {
          manager.once("finalTranscript", resolve);
        },
      );

      client.emit("transcription", {
        text: "complete",
        isFinal: true,
        confidence: 0.98,
      });

      const [transcript, finalTranscript] = await Promise.all([
        transcriptPromise,
        finalTranscriptPromise,
      ]);

      expect(transcript.userId).toBe("user1");
      expect(finalTranscript.userId).toBe("user1");
    });

    it("forwards errors with userId", async () => {
      await manager.startUser("user1");
      const client = getMockClient();

      const errorPromise = new Promise<{ error: Error; userId: string }>(
        (resolve) => {
          manager.once("error", (error, userId) => resolve({ error, userId }));
        },
      );

      const testError = new Error("STT failed");
      setImmediate(() => {
        client.emit("error", testError);
      });

      const { error, userId } = await errorPromise;
      expect(error).toBe(testError);
      expect(userId).toBe("user1");
    });
  });

  describe("Multi-User Handling", () => {
    it("tracks multiple active users", async () => {
      const mockClient1 = new EventEmitter();
      (mockClient1 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient1 as any).stop = vi.fn();
      (mockClient1 as any).sendAudio = vi.fn();
      (mockClient1 as any).destroy = vi.fn();

      const mockClient2 = new EventEmitter();
      (mockClient2 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient2 as any).stop = vi.fn();
      (mockClient2 as any).sendAudio = vi.fn();
      (mockClient2 as any).destroy = vi.fn();

      const mockClient3 = new EventEmitter();
      (mockClient3 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient3 as any).stop = vi.fn();
      (mockClient3 as any).sendAudio = vi.fn();
      (mockClient3 as any).destroy = vi.fn();

      DeepgramSTT.mockImplementationOnce(() => mockClient1)
        .mockImplementationOnce(() => mockClient2)
        .mockImplementationOnce(() => mockClient3);

      await manager.startUser("user1");
      await manager.startUser("user2");
      await manager.startUser("user3");

      const activeUsers = manager.getActiveUsers();
      expect(activeUsers).toHaveLength(3);
      expect(activeUsers).toContain("user1");
      expect(activeUsers).toContain("user2");
      expect(activeUsers).toContain("user3");
    });

    it("handles transcripts from multiple users simultaneously", async () => {
      const mockClient1 = new EventEmitter();
      (mockClient1 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient1 as any).stop = vi.fn();
      (mockClient1 as any).sendAudio = vi.fn();
      (mockClient1 as any).destroy = vi.fn();

      const mockClient2 = new EventEmitter();
      (mockClient2 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient2 as any).stop = vi.fn();
      (mockClient2 as any).sendAudio = vi.fn();
      (mockClient2 as any).destroy = vi.fn();

      DeepgramSTT.mockImplementationOnce(
        () => mockClient1,
      ).mockImplementationOnce(() => mockClient2);

      await manager.startUser("user1");
      await manager.startUser("user2");

      const transcripts: TranscriptionEvent[] = [];
      manager.on("transcript", (event) => transcripts.push(event));

      mockClient1.emit("transcription", {
        text: "from user 1",
        isFinal: false,
        confidence: 0.9,
      });

      mockClient2.emit("transcription", {
        text: "from user 2",
        isFinal: false,
        confidence: 0.85,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(transcripts).toHaveLength(2);
      expect(transcripts.find((t) => t.userId === "user1")?.text).toBe(
        "from user 1",
      );
      expect(transcripts.find((t) => t.userId === "user2")?.text).toBe(
        "from user 2",
      );
    });
  });

  describe("Metrics", () => {
    it("tracks transcript count", async () => {
      await manager.startUser("user1");
      const client = getMockClient();

      client.emit("transcription", {
        text: "first",
        isFinal: false,
        confidence: 0.9,
      });

      client.emit("transcription", {
        text: "second",
        isFinal: true,
        confidence: 0.95,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const metrics = manager.getMetrics();
      expect(metrics.transcriptCount).toBe(2);
    });

    it("tracks active user count", async () => {
      const mockClient1 = new EventEmitter();
      (mockClient1 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient1 as any).stop = vi.fn();
      (mockClient1 as any).sendAudio = vi.fn();
      (mockClient1 as any).destroy = vi.fn();

      const mockClient2 = new EventEmitter();
      (mockClient2 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient2 as any).stop = vi.fn();
      (mockClient2 as any).sendAudio = vi.fn();
      (mockClient2 as any).destroy = vi.fn();

      DeepgramSTT.mockImplementationOnce(
        () => mockClient1,
      ).mockImplementationOnce(() => mockClient2);

      await manager.startUser("user1");
      await manager.startUser("user2");

      let metrics = manager.getMetrics();
      expect(metrics.activeUsers).toBe(2);

      manager.stopUser("user1");

      metrics = manager.getMetrics();
      expect(metrics.activeUsers).toBe(1);
    });

    it("tracks average latency", async () => {
      await manager.startUser("user1");
      const client = getMockClient();

      // Simulate audio send followed by transcript
      const audioTime = Date.now();
      manager.sendAudio("user1", Buffer.from("audio"));

      // Wait a bit to simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 50));

      client.emit("transcription", {
        text: "result",
        isFinal: true,
        confidence: 0.9,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const metrics = manager.getMetrics();
      expect(metrics.averageLatency).toBeGreaterThan(0);
    });
  });

  describe("Cleanup", () => {
    it("destroys all STT clients on destroy", async () => {
      const mockClient1 = new EventEmitter();
      (mockClient1 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient1 as any).stop = vi.fn();
      (mockClient1 as any).sendAudio = vi.fn();
      (mockClient1 as any).destroy = vi.fn();

      const mockClient2 = new EventEmitter();
      (mockClient2 as any).start = vi.fn().mockResolvedValue(undefined);
      (mockClient2 as any).stop = vi.fn();
      (mockClient2 as any).sendAudio = vi.fn();
      (mockClient2 as any).destroy = vi.fn();

      DeepgramSTT.mockImplementationOnce(
        () => mockClient1,
      ).mockImplementationOnce(() => mockClient2);

      await manager.startUser("user1");
      await manager.startUser("user2");

      manager.destroy();

      expect(mockClient1.destroy).toHaveBeenCalledTimes(1);
      expect(mockClient2.destroy).toHaveBeenCalledTimes(1);
      expect(manager.getActiveUsers()).toHaveLength(0);
    });

    it("removes all event listeners on destroy", async () => {
      await manager.startUser("user1");

      manager.on("transcript", () => {});
      manager.on("finalTranscript", () => {});

      const listenersBefore = manager.listenerCount("transcript");
      expect(listenersBefore).toBeGreaterThan(0);

      manager.destroy();

      const listenersAfter = manager.listenerCount("transcript");
      expect(listenersAfter).toBe(0);
    });
  });

  describe("Configuration", () => {
    it("passes config to DeepgramSTT clients", async () => {
      const customManager = new STTManager({
        model: "nova-3",
        language: "es-ES",
        interimResults: false,
      });

      await customManager.startUser("user1");

      expect(DeepgramSTT).toHaveBeenCalledWith({
        model: "nova-3",
        language: "es-ES",
        interimResults: false,
      });

      customManager.destroy();
    });
  });
});
