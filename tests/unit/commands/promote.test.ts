// ABOUTME: Unit tests for PromoteCommand
// ABOUTME: Tests promoting users to speaker in Stage channels

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromoteCommand } from "../../../src/commands/promote";
import {
  ChatInputCommandInteraction,
  ChannelType,
  GuildMember,
  StageChannel,
} from "discord.js";

function createMockInteraction(options: {
  targetUser?: any;
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
    options: {
      getMember: vi.fn().mockReturnValue(options.targetUser || null),
    },
    member: member as unknown as GuildMember,
  } as unknown as ChatInputCommandInteraction;
}

function createMockStageChannel() {
  return {
    id: "channel-id",
    name: "test-stage",
    type: ChannelType.GuildStageVoice,
    stageInstance: { id: "instance123" },
  } as unknown as StageChannel;
}

function createMockTargetUser(options: {
  inChannel?: any;
  isSuppressed?: boolean;
} = {}) {
  return {
    id: "target-id",
    displayName: "TargetUser",
    voice: {
      channel: options.inChannel || null,
      suppress: options.isSuppressed ?? true,
      setSuppressed: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as GuildMember;
}

describe("PromoteCommand", () => {
  let promoteCommand: PromoteCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    promoteCommand = new PromoteCommand();
  });

  it("should be defined with correct name", () => {
    expect(promoteCommand).toBeDefined();
    expect(promoteCommand.data.name).toBe("promote");
  });

  it("should have required user option", () => {
    const json = promoteCommand.data.toJSON();
    const userOption = json.options?.find((opt: any) => opt.name === "user");
    expect(userOption).toBeDefined();
    expect(userOption?.required).toBe(true);
  });

  it("should promote user to speaker when in same Stage channel", async () => {
    const channel = createMockStageChannel();
    const targetUser = createMockTargetUser({ inChannel: channel });
    const interaction = createMockInteraction({
      targetUser,
      memberChannel: channel,
      hasPermissions: true,
    });

    await promoteCommand.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(targetUser.voice.setSuppressed).toHaveBeenCalledWith(false);
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Promoted"),
    );
  });

  it("should reply error if invoker not in voice channel", async () => {
    const channel = createMockStageChannel();
    const targetUser = createMockTargetUser({ inChannel: channel });
    const interaction = createMockInteraction({
      targetUser,
      memberChannel: null,
    });

    await promoteCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("must be in a Stage channel"),
    );
  });

  it("should reply error if invoker in regular voice channel", async () => {
    const voiceChannel = {
      id: "voice-id",
      name: "voice-channel",
      type: ChannelType.GuildVoice,
    };
    const targetUser = createMockTargetUser({ inChannel: voiceChannel });

    const interaction = createMockInteraction({
      targetUser,
      memberChannel: voiceChannel,
    });

    await promoteCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("must be in a Stage channel"),
    );
  });

  it("should reply error if invoker lacks permissions", async () => {
    const channel = createMockStageChannel();
    const targetUser = createMockTargetUser({ inChannel: channel });
    const interaction = createMockInteraction({
      targetUser,
      memberChannel: channel,
      hasPermissions: false,
    });

    await promoteCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("don't have permission"),
    );
  });

  it("should reply error if target user not in same channel", async () => {
    const channel = createMockStageChannel();
    const otherChannel = {
      id: "other-channel",
      name: "other-stage",
      type: ChannelType.GuildStageVoice,
    };
    const targetUser = createMockTargetUser({ inChannel: otherChannel });

    const interaction = createMockInteraction({
      targetUser,
      memberChannel: channel,
      hasPermissions: true,
    });

    await promoteCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("not in your Stage channel"),
    );
  });

  it("should reply error if target user not in any channel", async () => {
    const channel = createMockStageChannel();
    const targetUser = createMockTargetUser({ inChannel: null });

    const interaction = createMockInteraction({
      targetUser,
      memberChannel: channel,
      hasPermissions: true,
    });

    await promoteCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("not in your Stage channel"),
    );
  });

  it("should handle promotion errors gracefully", async () => {
    const channel = createMockStageChannel();
    const targetUser = createMockTargetUser({ inChannel: channel });
    (targetUser.voice.setSuppressed as any).mockRejectedValue(
      new Error("Promote failed"),
    );

    const interaction = createMockInteraction({
      targetUser,
      memberChannel: channel,
      hasPermissions: true,
    });

    await promoteCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Failed to promote"),
    );
  });
});
