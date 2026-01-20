// ABOUTME: Slash command to join a voice/stage channel
// ABOUTME: Validates permissions and uses VoiceConnectionManager to establish connection

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  GuildMember,
  VoiceBasedChannel,
  PermissionsBitField,
} from "discord.js";
import { Command } from "./types";
import { VoiceConnectionManager } from "../voice/connection";

export class JoinCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("join")
    .setDescription("Joins a voice or stage channel")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription(
          "The channel to join (defaults to your current channel)",
        )
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice),
    );

  constructor(private voiceManager: VoiceConnectionManager) {}

  execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    try {
      let channel = interaction.options.getChannel(
        "channel",
      ) as VoiceBasedChannel | null;

      if (!channel) {
        const member = interaction.member as GuildMember;
        channel = member.voice.channel;

        if (!channel) {
          await interaction.editReply(
            "You need to provide a channel or be in one for me to join.",
          );
          return;
        }
      }

      if (!channel.joinable) {
        await interaction.editReply(
          `I don't have permission to join ${channel.name}.`,
        );
        return;
      }

      if (channel.type === ChannelType.GuildStageVoice) {
        const permissions = channel.permissionsFor(interaction.client.user);
        if (
          !permissions?.has(PermissionsBitField.Flags.Connect) ||
          !permissions?.has(PermissionsBitField.Flags.RequestToSpeak)
        ) {
          await interaction.editReply(
            `I need Connect and Request to Speak permissions in ${channel.name}.`,
          );
          return;
        }
      }

      await this.voiceManager.joinChannel(channel);
      await interaction.editReply(`Joined ${channel.name}!`);
    } catch (error) {
      console.error("Error joining channel:", error);
      await interaction.editReply(
        "Failed to join the channel. Check my logs for details.",
      );
    }
  };
}
