// ABOUTME: Unit tests for Stage Channel management utilities
// ABOUTME: Tests Stage detection, Instance creation/termination, speaker management

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChannelType, PermissionFlagsBits, StageInstancePrivacyLevel } from "discord.js";

describe("Stage Channel Utilities", () => {
  describe("isStageChannel", () => {
    it("should return true for Stage channels (type 13)", async () => {
      const { isStageChannel } = await import("../../src/discord/stage");
      const channel = { type: ChannelType.GuildStageVoice };

      expect(isStageChannel(channel)).toBe(true);
    });

    it("should return false for non-Stage channels", async () => {
      const { isStageChannel } = await import("../../src/discord/stage");
      const voiceChannel = { type: ChannelType.GuildVoice };
      const textChannel = { type: ChannelType.GuildText };

      expect(isStageChannel(voiceChannel)).toBe(false);
      expect(isStageChannel(textChannel)).toBe(false);
    });
  });

  describe("hasStagePermissions", () => {
    it("should return true when member has required permissions", async () => {
      const { hasStagePermissions } = await import("../../src/discord/stage");
      const member = {
        permissions: {
          has: vi.fn((perm) => true),
        },
      };

      expect(hasStagePermissions(member)).toBe(true);
      expect(member.permissions.has).toHaveBeenCalledWith(
        PermissionFlagsBits.MuteMembers,
      );
      expect(member.permissions.has).toHaveBeenCalledWith(
        PermissionFlagsBits.ManageChannels,
      );
    });

    it("should return false when member lacks required permissions", async () => {
      const { hasStagePermissions } = await import("../../src/discord/stage");
      const member = {
        permissions: {
          has: vi.fn((perm) => false),
        },
      };

      expect(hasStagePermissions(member)).toBe(false);
    });
  });

  describe("createStageInstance", () => {
    it("should create a Stage Instance with topic and default privacy level", async () => {
      const { createStageInstance } = await import("../../src/discord/stage");

      const mockStageInstance = {
        id: "123456789",
        topic: "Test Topic",
        privacyLevel: StageInstancePrivacyLevel.GuildOnly,
      };

      const mockChannel = {
        type: ChannelType.GuildStageVoice,
        id: "channel123",
        guild: {
          stageInstances: {
            create: vi.fn().mockResolvedValue(mockStageInstance),
          },
        },
      };

      const result = await createStageInstance(mockChannel as any, "Test Topic");

      expect(mockChannel.guild.stageInstances.create).toHaveBeenCalledWith(
        mockChannel.id,
        {
          topic: "Test Topic",
          privacyLevel: StageInstancePrivacyLevel.GuildOnly,
        },
      );
      expect(result).toBe(mockStageInstance);
    });

    it("should create a Stage Instance with custom privacy level", async () => {
      const { createStageInstance } = await import("../../src/discord/stage");

      const mockStageInstance = {
        id: "123456789",
        topic: "Public Topic",
        privacyLevel: StageInstancePrivacyLevel.Public,
      };

      const mockChannel = {
        type: ChannelType.GuildStageVoice,
        id: "channel123",
        guild: {
          stageInstances: {
            create: vi.fn().mockResolvedValue(mockStageInstance),
          },
        },
      };

      const result = await createStageInstance(
        mockChannel as any,
        "Public Topic",
        StageInstancePrivacyLevel.Public,
      );

      expect(mockChannel.guild.stageInstances.create).toHaveBeenCalledWith(
        mockChannel.id,
        {
          topic: "Public Topic",
          privacyLevel: StageInstancePrivacyLevel.Public,
        },
      );
      expect(result).toBe(mockStageInstance);
    });

    it("should throw error if channel is not a Stage channel", async () => {
      const { createStageInstance } = await import("../../src/discord/stage");

      const mockChannel = {
        type: ChannelType.GuildVoice,
        id: "channel123",
      };

      await expect(
        createStageInstance(mockChannel as any, "Test Topic"),
      ).rejects.toThrow("Channel is not a Stage channel");
    });
  });

  describe("endStageInstance", () => {
    it("should delete the Stage Instance associated with a channel", async () => {
      const { endStageInstance } = await import("../../src/discord/stage");

      const mockStageInstance = {
        id: "instance123",
        delete: vi.fn().mockResolvedValue(undefined),
      };

      const mockChannel = {
        type: ChannelType.GuildStageVoice,
        id: "channel123",
        stageInstance: mockStageInstance,
      };

      await endStageInstance(mockChannel as any);

      expect(mockStageInstance.delete).toHaveBeenCalled();
    });

    it("should throw error if no Stage Instance exists", async () => {
      const { endStageInstance } = await import("../../src/discord/stage");

      const mockChannel = {
        type: ChannelType.GuildStageVoice,
        id: "channel123",
        stageInstance: null,
      };

      await expect(endStageInstance(mockChannel as any)).rejects.toThrow(
        "No active Stage Instance on this channel",
      );
    });

    it("should throw error if channel is not a Stage channel", async () => {
      const { endStageInstance } = await import("../../src/discord/stage");

      const mockChannel = {
        type: ChannelType.GuildVoice,
        id: "channel123",
      };

      await expect(endStageInstance(mockChannel as any)).rejects.toThrow(
        "Channel is not a Stage channel",
      );
    });
  });

  describe("setSpeakerState", () => {
    it("should unsuppress member to make them a speaker", async () => {
      const { setSpeakerState } = await import("../../src/discord/stage");

      const mockVoiceState = {
        channel: { id: "channel123" },
        setSuppressed: vi.fn().mockResolvedValue(undefined),
      };

      const mockMember = {
        voice: mockVoiceState,
      };

      await setSpeakerState(mockMember as any, false);

      expect(mockVoiceState.setSuppressed).toHaveBeenCalledWith(false);
    });

    it("should suppress member to move them to audience", async () => {
      const { setSpeakerState } = await import("../../src/discord/stage");

      const mockVoiceState = {
        channel: { id: "channel123" },
        setSuppressed: vi.fn().mockResolvedValue(undefined),
      };

      const mockMember = {
        voice: mockVoiceState,
      };

      await setSpeakerState(mockMember as any, true);

      expect(mockVoiceState.setSuppressed).toHaveBeenCalledWith(true);
    });

    it("should throw error if member is not in a voice channel", async () => {
      const { setSpeakerState } = await import("../../src/discord/stage");

      const mockMember = {
        voice: {
          channel: null,
          setSuppressed: vi.fn(),
        },
      };

      await expect(setSpeakerState(mockMember as any, false)).rejects.toThrow(
        "Member is not in a voice channel",
      );
    });
  });
});
