// ABOUTME: Unit tests for JoinCommand
// ABOUTME: Tests joining voice/stage channels with various scenarios

import { describe, it, expect, vi, beforeEach } from "vitest";
import { JoinCommand } from "../../../src/commands/join";
import { VoiceConnectionManager } from "../../../src/voice/connection";
import {
  ChatInputCommandInteraction,
  ChannelType,
  VoiceBasedChannel,
  GuildMember,
  PermissionsBitField,
} from "discord.js";

const mockVoiceManager = {
  joinChannel: vi.fn(),
} as unknown as VoiceConnectionManager;

function createMockInteraction(options: any = {}) {
  const replyMock = vi.fn();
  const editReplyMock = vi.fn();
  const deferReplyMock = vi.fn();

  return {
    deferReply: deferReplyMock,
    reply: replyMock,
    editReply: editReplyMock,
    options: {
      getChannel: vi.fn().mockReturnValue(options.channel || null),
    },
    member: {
      voice: {
        channel: options.memberChannel || null,
      },
    } as unknown as GuildMember,
    client: {
      user: { id: "bot-id" },
    },
  } as unknown as ChatInputCommandInteraction;
}

function createMockChannel(type: ChannelType, name: string = "test-channel") {
  return {
    id: "channel-id",
    name,
    type,
    joinable: true,
    permissionsFor: vi.fn().mockReturnValue({
      has: vi.fn().mockReturnValue(true),
    }),
  } as unknown as VoiceBasedChannel;
}

describe("JoinCommand", () => {
  let joinCommand: JoinCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    joinCommand = new JoinCommand(mockVoiceManager);
  });

  it("should be defined", () => {
    expect(joinCommand).toBeDefined();
    expect(joinCommand.data.name).toBe("join");
  });

  it("should join channel specified in options", async () => {
    const channel = createMockChannel(ChannelType.GuildVoice);
    const interaction = createMockInteraction({ channel });

    await joinCommand.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(mockVoiceManager.joinChannel).toHaveBeenCalledWith(channel);
    expect(interaction.editReply).toHaveBeenCalledWith(
      `Joined ${channel.name}!`,
    );
  });

  it("should join user's current channel if no option provided", async () => {
    const memberChannel = createMockChannel(ChannelType.GuildVoice);
    const interaction = createMockInteraction({ memberChannel });

    await joinCommand.execute(interaction);

    expect(mockVoiceManager.joinChannel).toHaveBeenCalledWith(memberChannel);
    expect(interaction.editReply).toHaveBeenCalledWith(
      `Joined ${memberChannel.name}!`,
    );
  });

  it("should reply error if no channel specified and user not in channel", async () => {
    const interaction = createMockInteraction({});

    await joinCommand.execute(interaction);

    expect(mockVoiceManager.joinChannel).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("need to provide a channel"),
    );
  });

  it("should reply error if channel is not joinable", async () => {
    const channel = createMockChannel(ChannelType.GuildVoice);
    (channel as any).joinable = false;
    const interaction = createMockInteraction({ channel });

    await joinCommand.execute(interaction);

    expect(mockVoiceManager.joinChannel).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("don't have permission"),
    );
  });

  it("should check stage channel permissions", async () => {
    const channel = createMockChannel(ChannelType.GuildStageVoice);
    const permissions = { has: vi.fn().mockReturnValue(false) };
    (channel.permissionsFor as any).mockReturnValue(permissions);

    const interaction = createMockInteraction({ channel });

    await joinCommand.execute(interaction);

    expect(mockVoiceManager.joinChannel).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("need Connect and Request to Speak"),
    );
  });

  it("should handle join errors gracefully", async () => {
    const channel = createMockChannel(ChannelType.GuildVoice);
    const interaction = createMockInteraction({ channel });
    (mockVoiceManager.joinChannel as any).mockRejectedValue(
      new Error("Join failed"),
    );

    await joinCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Failed to join"),
    );
  });
});
