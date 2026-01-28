// ABOUTME: Unit tests for StageStopCommand
// ABOUTME: Tests stopping Stage Instances with permission checks

import { describe, it, expect, vi, beforeEach } from "vitest";
import { StageStopCommand } from "../../../src/commands/stage-stop";
import {
  ChatInputCommandInteraction,
  ChannelType,
  GuildMember,
  StageChannel,
} from "discord.js";

function createMockInteraction(options: {
  memberChannel?: any;
  hasPermissions?: boolean;
} = {}) {
  const editReplyMock = vi.fn();
  const deferReplyMock = vi.fn();

  const member = {
    voice: {
      channel: options.memberChannel || null,
    },
    permissions: {
      has: vi.fn().mockReturnValue(options.hasPermissions ?? true),
    },
  };

  return {
    deferReply: deferReplyMock,
    editReply: editReplyMock,
    member: member as unknown as GuildMember,
  } as unknown as ChatInputCommandInteraction;
}

function createMockStageChannel(options: {
  hasInstance?: boolean;
} = {}) {
  const mockStageInstance = options.hasInstance
    ? {
        id: "instance123",
        topic: "Existing Topic",
        delete: vi.fn().mockResolvedValue(undefined),
      }
    : null;

  return {
    id: "channel-id",
    name: "test-stage",
    type: ChannelType.GuildStageVoice,
    stageInstance: mockStageInstance,
  } as unknown as StageChannel;
}

describe("StageStopCommand", () => {
  let stageStopCommand: StageStopCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    stageStopCommand = new StageStopCommand();
  });

  it("should be defined with correct name", () => {
    expect(stageStopCommand).toBeDefined();
    expect(stageStopCommand.data.name).toBe("stage-stop");
  });

  it("should end Stage Instance when user is in Stage channel with active instance", async () => {
    const channel = createMockStageChannel({ hasInstance: true });
    const interaction = createMockInteraction({
      memberChannel: channel,
      hasPermissions: true,
    });

    await stageStopCommand.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(channel.stageInstance!.delete).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Ended"),
    );
  });

  it("should reply error if user not in voice channel", async () => {
    const interaction = createMockInteraction({
      memberChannel: null,
    });

    await stageStopCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("must be in a Stage channel"),
    );
  });

  it("should reply error if user in regular voice channel", async () => {
    const voiceChannel = {
      id: "voice-id",
      name: "voice-channel",
      type: ChannelType.GuildVoice,
    };

    const interaction = createMockInteraction({
      memberChannel: voiceChannel,
    });

    await stageStopCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("must be in a Stage channel"),
    );
  });

  it("should reply error if user lacks stage permissions", async () => {
    const channel = createMockStageChannel({ hasInstance: true });
    const interaction = createMockInteraction({
      memberChannel: channel,
      hasPermissions: false,
    });

    await stageStopCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("don't have permission"),
    );
  });

  it("should reply error if no Stage Instance exists", async () => {
    const channel = createMockStageChannel({ hasInstance: false });
    const interaction = createMockInteraction({
      memberChannel: channel,
      hasPermissions: true,
    });

    await stageStopCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("no active Stage Instance"),
    );
  });

  it("should handle deletion errors gracefully", async () => {
    const channel = createMockStageChannel({ hasInstance: true });
    (channel.stageInstance!.delete as any).mockRejectedValue(
      new Error("Delete failed"),
    );

    const interaction = createMockInteraction({
      memberChannel: channel,
      hasPermissions: true,
    });

    await stageStopCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Failed to end"),
    );
  });
});
