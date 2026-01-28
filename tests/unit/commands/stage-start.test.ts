// ABOUTME: Unit tests for StageStartCommand
// ABOUTME: Tests starting Stage Instances with topic and permission checks

import { describe, it, expect, vi, beforeEach } from "vitest";
import { StageStartCommand } from "../../../src/commands/stage-start";
import {
  ChatInputCommandInteraction,
  ChannelType,
  GuildMember,
  StageChannel,
  StageInstancePrivacyLevel,
} from "discord.js";

function createMockInteraction(options: {
  topic?: string;
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
      getString: vi.fn().mockReturnValue(options.topic || null),
    },
    member: member as unknown as GuildMember,
  } as unknown as ChatInputCommandInteraction;
}

function createMockStageChannel(options: {
  hasInstance?: boolean;
} = {}) {
  const mockStageInstance = options.hasInstance
    ? { id: "instance123", topic: "Existing Topic" }
    : null;

  return {
    id: "channel-id",
    name: "test-stage",
    type: ChannelType.GuildStageVoice,
    stageInstance: mockStageInstance,
    guild: {
      stageInstances: {
        create: vi.fn().mockResolvedValue({
          id: "new-instance",
          topic: "Test Topic",
        }),
      },
    },
  } as unknown as StageChannel;
}

describe("StageStartCommand", () => {
  let stageStartCommand: StageStartCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    stageStartCommand = new StageStartCommand();
  });

  it("should be defined with correct name", () => {
    expect(stageStartCommand).toBeDefined();
    expect(stageStartCommand.data.name).toBe("stage-start");
  });

  it("should have required topic option", () => {
    const json = stageStartCommand.data.toJSON();
    const topicOption = json.options?.find((opt: any) => opt.name === "topic");
    expect(topicOption).toBeDefined();
    expect(topicOption?.required).toBe(true);
  });

  it("should create Stage Instance when user is in Stage channel", async () => {
    const channel = createMockStageChannel();
    const interaction = createMockInteraction({
      topic: "Test Topic",
      memberChannel: channel,
      hasPermissions: true,
    });

    await stageStartCommand.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(channel.guild.stageInstances.create).toHaveBeenCalledWith(
      channel.id,
      {
        topic: "Test Topic",
        privacyLevel: StageInstancePrivacyLevel.GuildOnly,
      },
    );
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Started"),
    );
  });

  it("should reply error if user not in voice channel", async () => {
    const interaction = createMockInteraction({
      topic: "Test Topic",
      memberChannel: null,
    });

    await stageStartCommand.execute(interaction);

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
      topic: "Test Topic",
      memberChannel: voiceChannel,
    });

    await stageStartCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("must be in a Stage channel"),
    );
  });

  it("should reply error if user lacks stage permissions", async () => {
    const channel = createMockStageChannel();
    const interaction = createMockInteraction({
      topic: "Test Topic",
      memberChannel: channel,
      hasPermissions: false,
    });

    await stageStartCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("don't have permission"),
    );
  });

  it("should reply error if Stage Instance already exists", async () => {
    const channel = createMockStageChannel({ hasInstance: true });
    const interaction = createMockInteraction({
      topic: "Test Topic",
      memberChannel: channel,
      hasPermissions: true,
    });

    await stageStartCommand.execute(interaction);

    expect(channel.guild.stageInstances.create).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("already has an active"),
    );
  });

  it("should handle creation errors gracefully", async () => {
    const channel = createMockStageChannel();
    (channel.guild.stageInstances.create as any).mockRejectedValue(
      new Error("Creation failed"),
    );

    const interaction = createMockInteraction({
      topic: "Test Topic",
      memberChannel: channel,
      hasPermissions: true,
    });

    await stageStartCommand.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.stringContaining("Failed to start"),
    );
  });
});
