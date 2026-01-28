// ABOUTME: Tests for AudioOutputManager - orchestrates audio playback
// ABOUTME: Verifies player lifecycle, queue integration, barge-in, and statistics

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import {
  AudioPlayerStatus,
  createAudioResource,
  createAudioPlayer,
  AudioPlayer,
} from "@discordjs/voice";

// Mock @discordjs/voice
vi.mock("@discordjs/voice", async () => {
  const actual =
    await vi.importActual<typeof import("@discordjs/voice")>(
      "@discordjs/voice",
    );
  return {
    ...actual,
    createAudioPlayer: vi.fn(),
    createAudioResource: vi.fn(),
  };
});

import { AudioOutputManager } from "../../../../src/voice/output/manager.js";
import type {
  AudioSegment,
  BargeInConfig,
} from "../../../../src/voice/output/types.js";
import { TEST_AUDIO } from "../../../fixtures/audio/fixtures.js";

// Helper to create mock AudioPlayer
function createMockPlayer(): AudioPlayer {
  const player = new EventEmitter() as any;
  player.state = { status: AudioPlayerStatus.Idle };
  player.play = vi.fn();
  player.stop = vi.fn(() => true);
  player.pause = vi.fn(() => true);
  player.unpause = vi.fn(() => true);
  return player;
}

// Helper to create mock VoiceConnection
function createMockConnection() {
  const conn = new EventEmitter() as any;
  conn.subscribe = vi.fn();
  conn.state = { status: "ready" };
  return conn;
}

describe("AudioOutputManager", () => {
  let manager: AudioOutputManager;
  let mockCreatePlayer: ReturnType<typeof vi.fn>;
  let mockCreateResource: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const voice = await import("@discordjs/voice");
    mockCreatePlayer = voice.createAudioPlayer as unknown as ReturnType<
      typeof vi.fn
    >;
    mockCreateResource = voice.createAudioResource as unknown as ReturnType<
      typeof vi.fn
    >;

    mockCreatePlayer.mockImplementation(() => createMockPlayer());
    mockCreateResource.mockImplementation((input) => ({
      audioPlayer: null,
      metadata: null,
      edges: [],
      playStream: input,
    }));

    manager = new AudioOutputManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("initialization", () => {
    it("creates AudioOutputManager instance", () => {
      expect(manager).toBeInstanceOf(AudioOutputManager);
    });

    it("initializes with empty state", () => {
      expect(manager.isPlaying("guild-123")).toBe(false);
      expect(manager.getQueueSize("guild-123")).toBe(0);
    });
  });

  describe("attachToConnection", () => {
    it("creates player and subscribes to connection", () => {
      const mockConnection = createMockConnection();

      manager.attachToConnection("guild-123", mockConnection);

      expect(mockCreatePlayer).toHaveBeenCalled();
      expect(mockConnection.subscribe).toHaveBeenCalled();
    });

    it("reuses existing player for same guild", () => {
      const mockConnection = createMockConnection();

      manager.attachToConnection("guild-123", mockConnection);
      manager.attachToConnection("guild-123", mockConnection);

      expect(mockCreatePlayer).toHaveBeenCalledTimes(1);
    });

    it("creates separate players for different guilds", () => {
      const mockConnection1 = createMockConnection();
      const mockConnection2 = createMockConnection();

      manager.attachToConnection("guild-1", mockConnection1);
      manager.attachToConnection("guild-2", mockConnection2);

      expect(mockCreatePlayer).toHaveBeenCalledTimes(2);
    });
  });

  describe("play", () => {
    it("plays audio segment immediately when idle", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);

      const segment: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        text: "Hello",
      };

      manager.play("guild-123", segment);

      expect(mockPlayer.play).toHaveBeenCalled();
      expect(mockCreateResource).toHaveBeenCalled();
    });

    it("enqueues audio when already playing", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockPlayer.state.status = AudioPlayerStatus.Playing;
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);

      const segment1: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        text: "First",
      };
      const segment2: AudioSegment = {
        data: TEST_AUDIO.MEDIUM,
        streaming: false,
        text: "Second",
      };

      manager.play("guild-123", segment1);
      manager.play("guild-123", segment2);

      // One playing, one queued
      expect(manager.getQueueSize("guild-123")).toBe(1);
      // One playing, one queued
      expect(manager.getQueueSize("guild-123")).toBe(1);
    });

    it("emits playbackStarted event", () => {
      const mockConnection = createMockConnection();
      manager.attachToConnection("guild-123", mockConnection);

      const startedHandler = vi.fn();
      manager.on("playbackStarted", startedHandler);

      const segment: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        text: "Test",
      };

      manager.play("guild-123", segment);

      expect(startedHandler).toHaveBeenCalledWith("guild-123", segment);
    });

    it("throws when no player attached", () => {
      const segment: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
      };

      expect(() => {
        manager.play("guild-123", segment);
      }).toThrow();
    });
  });

  describe("stop", () => {
    it("stops current playback", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);
      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });

      manager.stop("guild-123");

      expect(mockPlayer.stop).toHaveBeenCalled();
    });

    it("clears the queue", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockPlayer.state.status = AudioPlayerStatus.Playing;
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);
      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });
      manager.play("guild-123", { data: TEST_AUDIO.MEDIUM, streaming: false });
      manager.play("guild-123", { data: TEST_AUDIO.LONG, streaming: false });

      manager.stop("guild-123");

      expect(manager.getQueueSize("guild-123")).toBe(0);
    });

    it("emits playbackStopped event", () => {
      const mockConnection = createMockConnection();
      manager.attachToConnection("guild-123", mockConnection);

      const stoppedHandler = vi.fn();
      manager.on("playbackStopped", stoppedHandler);

      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });
      manager.stop("guild-123");

      expect(stoppedHandler).toHaveBeenCalledWith("guild-123");
    });
  });

  describe("pause and resume", () => {
    it("pauses current playback", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);
      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });

      manager.pause("guild-123");

      expect(mockPlayer.pause).toHaveBeenCalled();
    });

    it("resumes paused playback", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);
      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });
      manager.pause("guild-123");

      manager.resume("guild-123");

      expect(mockPlayer.unpause).toHaveBeenCalled();
    });
  });

  describe("player state transitions", () => {
    it("plays next queued item when current finishes", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      // Start with Idle so first play() actually plays
      mockPlayer.state.status = AudioPlayerStatus.Idle;
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);

      // First play - should play immediately (player is Idle)
      manager.play("guild-123", {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        text: "First",
      });
      expect(mockPlayer.play).toHaveBeenCalledTimes(1);

      // Now set to Playing so second goes to queue
      mockPlayer.state.status = AudioPlayerStatus.Playing;
      manager.play("guild-123", {
        data: TEST_AUDIO.MEDIUM,
        streaming: false,
        text: "Second",
      });

      // Simulate player becoming idle (finished first track)
      mockPlayer.state.status = AudioPlayerStatus.Idle;
      mockPlayer.emit(
        "stateChange",
        { status: AudioPlayerStatus.Playing },
        { status: AudioPlayerStatus.Idle },
      );

      // Should have played the second item from queue
      expect(mockPlayer.play).toHaveBeenCalledTimes(2);
    });

    it("emits playbackFinished when track completes", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);

      const finishedHandler = vi.fn();
      manager.on("playbackFinished", finishedHandler);

      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });

      mockPlayer.emit(
        "stateChange",
        { status: AudioPlayerStatus.Playing },
        { status: AudioPlayerStatus.Idle },
      );

      expect(finishedHandler).toHaveBeenCalledWith("guild-123");
    });

    it("emits queueEmpty when queue is exhausted", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);

      const emptyHandler = vi.fn();
      manager.on("queueEmpty", emptyHandler);

      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });

      // Finish playing the only item
      mockPlayer.state.status = AudioPlayerStatus.Idle;
      mockPlayer.emit(
        "stateChange",
        { status: AudioPlayerStatus.Playing },
        { status: AudioPlayerStatus.Idle },
      );

      expect(emptyHandler).toHaveBeenCalledWith("guild-123");
    });
  });

  describe("barge-in integration", () => {
    it("stops playback on barge-in event", () => {
      const bargeInConfig: BargeInConfig = { enabled: true };
      const managerWithBargeIn = new AudioOutputManager(bargeInConfig);

      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      managerWithBargeIn.attachToConnection("guild-123", mockConnection);
      managerWithBargeIn.play("guild-123", {
        data: TEST_AUDIO.SHORT,
        streaming: false,
      });

      // Simulate user starting to speak
      managerWithBargeIn.onUserSpeechStart("guild-123", "user-456");

      expect(mockPlayer.stop).toHaveBeenCalled();

      managerWithBargeIn.destroy();
    });

    it("emits bargeIn event with context", () => {
      const bargeInConfig: BargeInConfig = { enabled: true };
      const managerWithBargeIn = new AudioOutputManager(bargeInConfig);

      const mockConnection = createMockConnection();
      managerWithBargeIn.attachToConnection("guild-123", mockConnection);

      const bargeInHandler = vi.fn();
      managerWithBargeIn.on("bargeIn", bargeInHandler);

      managerWithBargeIn.play("guild-123", {
        data: TEST_AUDIO.SHORT,
        streaming: false,
      });
      managerWithBargeIn.onUserSpeechStart("guild-123", "user-456");

      expect(bargeInHandler).toHaveBeenCalledWith("guild-123", "user-456");

      managerWithBargeIn.destroy();
    });

    it("does not barge-in when disabled", () => {
      const bargeInConfig: BargeInConfig = { enabled: false };
      const managerWithoutBargeIn = new AudioOutputManager(bargeInConfig);

      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      managerWithoutBargeIn.attachToConnection("guild-123", mockConnection);
      managerWithoutBargeIn.play("guild-123", {
        data: TEST_AUDIO.SHORT,
        streaming: false,
      });

      managerWithoutBargeIn.onUserSpeechStart("guild-123", "user-456");

      expect(mockPlayer.stop).not.toHaveBeenCalled();

      managerWithoutBargeIn.destroy();
    });
  });

  describe("statistics", () => {
    it("tracks playback statistics", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);

      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });
      mockPlayer.emit(
        "stateChange",
        { status: AudioPlayerStatus.Playing },
        { status: AudioPlayerStatus.Idle },
      );

      const stats = manager.getStats("guild-123");

      expect(stats).toBeDefined();
      expect(stats?.totalPlayed).toBe(1);
    });

    it("tracks interruption count from barge-in", () => {
      const bargeInConfig: BargeInConfig = { enabled: true };
      const managerWithBargeIn = new AudioOutputManager(bargeInConfig);

      const mockConnection = createMockConnection();
      managerWithBargeIn.attachToConnection("guild-123", mockConnection);

      managerWithBargeIn.play("guild-123", {
        data: TEST_AUDIO.SHORT,
        streaming: false,
      });
      managerWithBargeIn.onUserSpeechStart("guild-123", "user-456");

      const stats = managerWithBargeIn.getStats("guild-123");
      expect(stats?.interruptionCount).toBeGreaterThan(0);

      managerWithBargeIn.destroy();
    });

    it("tracks TTS latency when provided", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);

      const segment: AudioSegment = {
        data: TEST_AUDIO.SHORT,
        streaming: false,
        requestedAt: Date.now() - 500, // 500ms ago
      };

      manager.play("guild-123", segment);

      mockPlayer.emit(
        "stateChange",
        { status: AudioPlayerStatus.Playing },
        { status: AudioPlayerStatus.Idle },
      );

      const stats = manager.getStats("guild-123");
      expect(stats?.averageTTSLatency).toBeGreaterThan(0);
    });
  });

  describe("destroy", () => {
    it("stops all players and clears state", () => {
      const mockConnection1 = createMockConnection();
      const mockConnection2 = createMockConnection();
      const mockPlayer1 = createMockPlayer();
      const mockPlayer2 = createMockPlayer();

      mockCreatePlayer
        .mockReturnValueOnce(mockPlayer1)
        .mockReturnValueOnce(mockPlayer2);

      manager.attachToConnection("guild-1", mockConnection1);
      manager.attachToConnection("guild-2", mockConnection2);

      manager.play("guild-1", { data: TEST_AUDIO.SHORT, streaming: false });
      manager.play("guild-2", { data: TEST_AUDIO.MEDIUM, streaming: false });

      manager.destroy();

      expect(mockPlayer1.stop).toHaveBeenCalled();
      expect(mockPlayer2.stop).toHaveBeenCalled();
      expect(manager.getQueueSize("guild-1")).toBe(0);
      expect(manager.getQueueSize("guild-2")).toBe(0);
    });
  });

  describe("isPlaying", () => {
    it("returns false when player not attached", () => {
      expect(manager.isPlaying("guild-123")).toBe(false);
    });

    it("returns true when player is Playing", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockPlayer.state.status = AudioPlayerStatus.Playing;
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);
      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });

      expect(manager.isPlaying("guild-123")).toBe(true);
    });

    it("returns false when player is Idle", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      mockPlayer.state.status = AudioPlayerStatus.Idle;
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);

      expect(manager.isPlaying("guild-123")).toBe(false);
    });
  });

  describe("getQueueSize", () => {
    it("returns 0 when no guild player", () => {
      expect(manager.getQueueSize("unknown-guild")).toBe(0);
    });

    it("returns correct queue size", () => {
      const mockConnection = createMockConnection();
      const mockPlayer = createMockPlayer();
      // Start Idle so first plays, then set Playing so rest queue
      mockPlayer.state.status = AudioPlayerStatus.Idle;
      mockCreatePlayer.mockReturnValue(mockPlayer);

      manager.attachToConnection("guild-123", mockConnection);

      // First plays immediately
      manager.play("guild-123", { data: TEST_AUDIO.SHORT, streaming: false });

      // Set to Playing so rest queue
      mockPlayer.state.status = AudioPlayerStatus.Playing;
      manager.play("guild-123", { data: TEST_AUDIO.MEDIUM, streaming: false });
      manager.play("guild-123", { data: TEST_AUDIO.LONG, streaming: false });

      // One playing (first), two in queue
      expect(manager.getQueueSize("guild-123")).toBe(2);
    });
  });
});
