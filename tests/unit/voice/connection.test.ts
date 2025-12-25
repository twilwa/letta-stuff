// ABOUTME: Tests for VoiceConnectionManager
// ABOUTME: Verifies connection lifecycle, state transitions, and Stage handling

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import {
  VoiceConnectionStatus,
  VoiceConnectionState,
  entersState,
} from "@discordjs/voice";

// Mock @discordjs/voice before imports
vi.mock("@discordjs/voice", async () => {
  const actual =
    await vi.importActual<typeof import("@discordjs/voice")>(
      "@discordjs/voice",
    );
  return {
    ...actual,
    joinVoiceChannel: vi.fn(),
    entersState: vi.fn(),
    getVoiceConnection: vi.fn(),
    generateDependencyReport: vi.fn(() => "All dependencies satisfied"),
  };
});

import {
  VoiceConnectionManager,
  VoiceConnectionEvents,
  checkDependencies,
} from "../../../src/voice/connection/index.js";

// Helper to create mock VoiceConnection
function createMockConnection(guildId: string): EventEmitter & {
  state: { status: VoiceConnectionStatus };
  destroy: () => void;
  rejoin: () => boolean;
} {
  const conn = new EventEmitter() as any;
  conn.state = { status: VoiceConnectionStatus.Signalling };
  conn.destroy = vi.fn();
  conn.rejoin = vi.fn(() => true);
  return conn;
}

// Helper to create mock voice channel
function createMockChannel(
  type: "voice" | "stage" = "voice",
  guildId = "guild-123",
) {
  return {
    id: "channel-456",
    guild: { id: guildId, voiceAdapterCreator: {} },
    type: type === "stage" ? 13 : 2, // GuildStageVoice = 13, GuildVoice = 2
    setStatus: vi.fn(),
  };
}

describe("VoiceConnectionManager", () => {
  let manager: VoiceConnectionManager;
  let mockJoinVoiceChannel: ReturnType<typeof vi.fn>;
  let mockEntersState: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const voice = await import("@discordjs/voice");
    mockJoinVoiceChannel = voice.joinVoiceChannel as unknown as ReturnType<
      typeof vi.fn
    >;
    mockEntersState = voice.entersState as unknown as ReturnType<typeof vi.fn>;
    manager = new VoiceConnectionManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("joinChannel", () => {
    it("creates a new connection when none exists", async () => {
      const mockConn = createMockConnection("guild-123");
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const channel = createMockChannel("voice", "guild-123");
      const result = await manager.joinChannel(channel as any);

      expect(mockJoinVoiceChannel).toHaveBeenCalledWith({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
      expect(result).toBe(mockConn);
    });

    it("returns existing connection for same guild", async () => {
      const mockConn = createMockConnection("guild-123");
      mockConn.state.status = VoiceConnectionStatus.Ready;
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const channel = createMockChannel("voice", "guild-123");

      // First join
      const conn1 = await manager.joinChannel(channel as any);
      // Second join
      const conn2 = await manager.joinChannel(channel as any);

      expect(mockJoinVoiceChannel).toHaveBeenCalledTimes(1);
      expect(conn1).toBe(conn2);
    });

    it("emits ready event when connection becomes ready", async () => {
      const mockConn = createMockConnection("guild-123");
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockImplementation(async () => {
        mockConn.state.status = VoiceConnectionStatus.Ready;
        mockConn.emit(
          "stateChange",
          { status: VoiceConnectionStatus.Signalling },
          { status: VoiceConnectionStatus.Ready },
        );
        return mockConn;
      });

      const readyHandler = vi.fn();
      manager.on("ready", readyHandler);

      const channel = createMockChannel("voice", "guild-123");
      await manager.joinChannel(channel as any);

      expect(readyHandler).toHaveBeenCalledWith("guild-123");
    });
  });

  describe("leaveChannel", () => {
    it("destroys connection when leaving", async () => {
      const mockConn = createMockConnection("guild-123");
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const channel = createMockChannel("voice", "guild-123");
      await manager.joinChannel(channel as any);

      manager.leaveChannel("guild-123");

      expect(mockConn.destroy).toHaveBeenCalled();
      expect(manager.getConnection("guild-123")).toBeUndefined();
    });

    it("does not error when leaving non-existent connection", () => {
      expect(() => manager.leaveChannel("unknown-guild")).not.toThrow();
    });
  });

  describe("getConnection", () => {
    it("returns undefined for unknown guild", () => {
      expect(manager.getConnection("unknown")).toBeUndefined();
    });

    it("returns connection for connected guild", async () => {
      const mockConn = createMockConnection("guild-123");
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const channel = createMockChannel("voice", "guild-123");
      await manager.joinChannel(channel as any);

      expect(manager.getConnection("guild-123")).toBe(mockConn);
    });
  });

  describe("isConnected", () => {
    it("returns false for unknown guild", () => {
      expect(manager.isConnected("unknown")).toBe(false);
    });

    it("returns true when connection is Ready", async () => {
      const mockConn = createMockConnection("guild-123");
      mockConn.state.status = VoiceConnectionStatus.Ready;
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const channel = createMockChannel("voice", "guild-123");
      await manager.joinChannel(channel as any);

      expect(manager.isConnected("guild-123")).toBe(true);
    });

    it("returns false when connection is not Ready", async () => {
      const mockConn = createMockConnection("guild-123");
      mockConn.state.status = VoiceConnectionStatus.Connecting;
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const channel = createMockChannel("voice", "guild-123");
      await manager.joinChannel(channel as any);

      expect(manager.isConnected("guild-123")).toBe(false);
    });
  });

  describe("connection lifecycle", () => {
    it("attempts reconnection on unexpected disconnect", async () => {
      vi.useFakeTimers();
      const mockConn = createMockConnection("guild-123");
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const channel = createMockChannel("voice", "guild-123");
      await manager.joinChannel(channel as any);

      // Simulate disconnect
      mockConn.emit(
        "stateChange",
        { status: VoiceConnectionStatus.Ready },
        { status: VoiceConnectionStatus.Disconnected, reason: 4014 },
      );

      // Fast-forward through the backoff delay
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockConn.rejoin).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it("emits disconnected event on permanent disconnect", async () => {
      const mockConn = createMockConnection("guild-123");
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const disconnectedHandler = vi.fn();
      manager.on("disconnected", disconnectedHandler);

      const channel = createMockChannel("voice", "guild-123");
      await manager.joinChannel(channel as any);

      // Simulate destroyed state
      mockConn.emit(
        "stateChange",
        { status: VoiceConnectionStatus.Ready },
        { status: VoiceConnectionStatus.Destroyed },
      );

      expect(disconnectedHandler).toHaveBeenCalledWith("guild-123");
    });
  });

  describe("Stage channel handling", () => {
    it("requests to become speaker when joining Stage", async () => {
      const mockConn = createMockConnection("guild-123");
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const channel = createMockChannel("stage", "guild-123");
      const requestSpeaker = vi.fn();

      // Manager should emit stageSpeakerRequest for Stage channels
      const stageHandler = vi.fn();
      manager.on("stageSpeakerRequest", stageHandler);

      await manager.joinChannel(channel as any);

      expect(stageHandler).toHaveBeenCalledWith("guild-123", channel);
    });
  });

  describe("destroy", () => {
    it("destroys all active connections", async () => {
      const mockConn1 = createMockConnection("guild-1");
      const mockConn2 = createMockConnection("guild-2");
      mockJoinVoiceChannel
        .mockReturnValueOnce(mockConn1)
        .mockReturnValueOnce(mockConn2);
      mockEntersState.mockResolvedValue(mockConn1);

      const channel1 = createMockChannel("voice", "guild-1");
      const channel2 = createMockChannel("voice", "guild-2");

      await manager.joinChannel(channel1 as any);
      mockEntersState.mockResolvedValue(mockConn2);
      await manager.joinChannel(channel2 as any);

      manager.destroy();

      expect(mockConn1.destroy).toHaveBeenCalled();
      expect(mockConn2.destroy).toHaveBeenCalled();
    });
  });

  describe("exponential backoff", () => {
    it("emits error after max reconnection attempts", async () => {
      vi.useFakeTimers();
      const customManager = new VoiceConnectionManager({
        maxReconnectAttempts: 2,
        reconnectBaseDelay: 100,
      });

      const mockConn = createMockConnection("guild-123");
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const errorHandler = vi.fn();
      customManager.on("error", errorHandler);

      const channel = createMockChannel("voice", "guild-123");
      await customManager.joinChannel(channel as any);

      // First disconnect - attempt 1
      mockConn.emit(
        "stateChange",
        { status: VoiceConnectionStatus.Ready },
        { status: VoiceConnectionStatus.Disconnected, reason: 4014 },
      );
      await vi.advanceTimersByTimeAsync(100);
      expect(mockConn.rejoin).toHaveBeenCalledTimes(1);

      // Second disconnect - attempt 2
      mockConn.emit(
        "stateChange",
        { status: VoiceConnectionStatus.Ready },
        { status: VoiceConnectionStatus.Disconnected, reason: 4014 },
      );
      await vi.advanceTimersByTimeAsync(200);
      expect(mockConn.rejoin).toHaveBeenCalledTimes(2);

      // Third disconnect - max reached, should emit error
      mockConn.emit(
        "stateChange",
        { status: VoiceConnectionStatus.Ready },
        { status: VoiceConnectionStatus.Disconnected, reason: 4014 },
      );

      expect(errorHandler).toHaveBeenCalledWith("guild-123", expect.any(Error));
      expect(mockConn.destroy).toHaveBeenCalled();

      customManager.destroy();
      vi.useRealTimers();
    });

    it("resets reconnect attempts on successful Ready", async () => {
      vi.useFakeTimers();
      const customManager = new VoiceConnectionManager({
        maxReconnectAttempts: 3,
        reconnectBaseDelay: 100,
      });

      const mockConn = createMockConnection("guild-123");
      mockJoinVoiceChannel.mockReturnValue(mockConn);
      mockEntersState.mockResolvedValue(mockConn);

      const channel = createMockChannel("voice", "guild-123");
      await customManager.joinChannel(channel as any);

      // First disconnect
      mockConn.emit(
        "stateChange",
        { status: VoiceConnectionStatus.Ready },
        { status: VoiceConnectionStatus.Disconnected, reason: 4014 },
      );
      await vi.advanceTimersByTimeAsync(100);
      expect(mockConn.rejoin).toHaveBeenCalledTimes(1);

      // Successful reconnect - resets counter
      mockConn.emit(
        "stateChange",
        { status: VoiceConnectionStatus.Connecting },
        { status: VoiceConnectionStatus.Ready },
      );

      // Second disconnect - should start fresh
      mockConn.emit(
        "stateChange",
        { status: VoiceConnectionStatus.Ready },
        { status: VoiceConnectionStatus.Disconnected, reason: 4014 },
      );
      await vi.advanceTimersByTimeAsync(100); // Base delay again (not doubled)
      expect(mockConn.rejoin).toHaveBeenCalledTimes(2);

      customManager.destroy();
      vi.useRealTimers();
    });
  });
});

describe("checkDependencies", () => {
  it("returns dependency report from @discordjs/voice", () => {
    const report = checkDependencies();
    expect(report).toBe("All dependencies satisfied");
  });
});
