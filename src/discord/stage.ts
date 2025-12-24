// ABOUTME: Stage Channel management utilities
// ABOUTME: Detection, permission checking, Instance creation/termination, speaker management

import { ChannelType, GuildMember, PermissionFlagsBits, StageChannel } from 'discord.js';

/**
 * Check if a channel is a Stage channel (type 13)
 */
export function isStageChannel(channel: any): channel is StageChannel {
  return channel.type === ChannelType.GuildStageVoice;
}

/**
 * Check if a guild member has required permissions for Stage management
 * Requires: MUTE_MEMBERS, MANAGE_CHANNELS
 */
export function hasStagePermissions(member: any): boolean {
  return (
    member.permissions.has(PermissionFlagsBits.MuteMembers) &&
    member.permissions.has(PermissionFlagsBits.ManageChannels)
  );
}
