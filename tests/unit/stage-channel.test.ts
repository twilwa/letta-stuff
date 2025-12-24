// ABOUTME: Unit tests for Stage Channel management utilities
// ABOUTME: Tests Stage detection, Instance creation/termination, speaker management

import { describe, it, expect, vi } from 'vitest';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

describe('Stage Channel Utilities', () => {
  describe('isStageChannel', () => {
    it('should return true for Stage channels (type 13)', async () => {
      const { isStageChannel } = await import('../../src/discord/stage');
      const channel = { type: ChannelType.GuildStageVoice };
      
      expect(isStageChannel(channel)).toBe(true);
    });

    it('should return false for non-Stage channels', async () => {
      const { isStageChannel } = await import('../../src/discord/stage');
      const voiceChannel = { type: ChannelType.GuildVoice };
      const textChannel = { type: ChannelType.GuildText };
      
      expect(isStageChannel(voiceChannel)).toBe(false);
      expect(isStageChannel(textChannel)).toBe(false);
    });
  });

  describe('hasStagePermissions', () => {
    it('should return true when member has required permissions', async () => {
      const { hasStagePermissions } = await import('../../src/discord/stage');
      const member = {
        permissions: {
          has: vi.fn((perm) => true)
        }
      };
      
      expect(hasStagePermissions(member)).toBe(true);
      expect(member.permissions.has).toHaveBeenCalledWith(PermissionFlagsBits.MuteMembers);
      expect(member.permissions.has).toHaveBeenCalledWith(PermissionFlagsBits.ManageChannels);
    });

    it('should return false when member lacks required permissions', async () => {
      const { hasStagePermissions } = await import('../../src/discord/stage');
      const member = {
        permissions: {
          has: vi.fn((perm) => false)
        }
      };
      
      expect(hasStagePermissions(member)).toBe(false);
    });
  });
});
