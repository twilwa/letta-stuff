// ABOUTME: Stage Channel management utilities
// ABOUTME: Detection, permission checking, Instance creation/termination, speaker management

import {
  ChannelType,
  GuildMember,
  PermissionFlagsBits,
  StageChannel,
  StageInstance,
  StageInstancePrivacyLevel,
} from "discord.js";

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

/**
 * Create a Stage Instance for a Stage channel
 * @param channel - The Stage channel to create the instance in
 * @param topic - The topic of the Stage Instance
 * @param privacyLevel - Privacy level (defaults to GuildOnly)
 * @returns The created StageInstance
 */
export async function createStageInstance(
  channel: StageChannel,
  topic: string,
  privacyLevel: StageInstancePrivacyLevel = StageInstancePrivacyLevel.GuildOnly,
): Promise<StageInstance> {
  if (!isStageChannel(channel)) {
    throw new Error("Channel is not a Stage channel");
  }

  return channel.guild.stageInstances.create(channel.id, {
    topic,
    privacyLevel,
  });
}

/**
 * End (delete) the Stage Instance for a Stage channel
 * @param channel - The Stage channel with an active Instance
 */
export async function endStageInstance(channel: StageChannel): Promise<void> {
  if (!isStageChannel(channel)) {
    throw new Error("Channel is not a Stage channel");
  }

  if (!channel.stageInstance) {
    throw new Error("No active Stage Instance on this channel");
  }

  await channel.stageInstance.delete();
}

/**
 * Set a member's speaker state in a Stage channel
 * @param member - The guild member to modify
 * @param suppress - true to move to audience, false to make speaker
 */
export async function setSpeakerState(
  member: GuildMember,
  suppress: boolean,
): Promise<void> {
  if (!member.voice.channel) {
    throw new Error("Member is not in a voice channel");
  }

  await member.voice.setSuppressed(suppress);
}
