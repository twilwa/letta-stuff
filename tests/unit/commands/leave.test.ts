// ABOUTME: Unit tests for LeaveCommand
// ABOUTME: Tests leaving voice/stage channels with various scenarios

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LeaveCommand } from "../../../src/commands/leave";
import { VoiceConnectionManager } from "../../../src/voice/connection";
import { ChatInputCommandInteraction } from "discord.js";

const mockVoiceManager = {
  leaveChannel: vi.fn(),
  isConnected: vi.fn(),
} as unknown as VoiceConnectionManager;

function createMockInteraction(options: any = {}) {
  const replyMock = vi.fn();

  return {
    reply: replyMock,
    guildId: options.guildId || "guild-id",
    options: {},
  } as unknown as ChatInputCommandInteraction;
}

describe("LeaveCommand", () => {
  let leaveCommand: LeaveCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    leaveCommand = new LeaveCommand(mockVoiceManager);
  });

  it("should be defined", () => {
    expect(leaveCommand).toBeDefined();
    expect(leaveCommand.data.name).toBe("leave");
  });

  it("should fail if used outside a guild", async () => {
    const interaction = createMockInteraction({ guildId: null });
    Object.defineProperty(interaction, "guildId", { value: null });

    await leaveCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "This command can only be used in a server.",
        ephemeral: true,
      }),
    );
    expect(mockVoiceManager.leaveChannel).not.toHaveBeenCalled();
  });

  it("should fail if bot is not connected", async () => {
    const interaction = createMockInteraction();
    (mockVoiceManager.isConnected as any).mockReturnValue(false);

    await leaveCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "I am not currently in a voice channel.",
        ephemeral: true,
      }),
    );
    expect(mockVoiceManager.leaveChannel).not.toHaveBeenCalled();
  });

  it("should disconnect if connected", async () => {
    const interaction = createMockInteraction();
    (mockVoiceManager.isConnected as any).mockReturnValue(true);

    await leaveCommand.execute(interaction);

    expect(mockVoiceManager.leaveChannel).toHaveBeenCalledWith("guild-id");
    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Disconnected from voice channel.",
    });
  });

  it("should handle leave errors gracefully", async () => {
    const interaction = createMockInteraction();
    (mockVoiceManager.isConnected as any).mockReturnValue(true);
    (mockVoiceManager.leaveChannel as any).mockImplementation(() => {
      throw new Error("Leave failed");
    });

    await leaveCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Failed to leave the voice channel.",
        ephemeral: true,
      }),
    );
  });
});
