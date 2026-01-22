// ABOUTME: Slash command to start a Stage Instance
// ABOUTME: Creates a Stage Instance with a topic in the user's current Stage channel

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  GuildMember,
  StageInstancePrivacyLevel,
} from "discord.js";
import { Command } from "./types";
import { isStageChannel, hasStagePermissions } from "../discord/stage";

export class StageStartCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("stage-start")
    .setDescription("Starts a Stage Instance in your current Stage channel")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("The topic of the Stage")
        .setRequired(true),
    );

  execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    try {
      const topic = interaction.options.getString("topic", true);
      const member = interaction.member as GuildMember;
      const channel = member.voice.channel;

      if (!channel || !isStageChannel(channel)) {
        await interaction.editReply(
          "You must be in a Stage channel to start a Stage Instance.",
        );
        return;
      }

      if (!hasStagePermissions(member)) {
        await interaction.editReply(
          "You don't have permission to manage Stage Instances.",
        );
        return;
      }

      if (channel.stageInstance) {
        await interaction.editReply(
          `${channel.name} already has an active Stage Instance.`,
        );
        return;
      }

      await channel.guild.stageInstances.create(channel.id, {
        topic,
        privacyLevel: StageInstancePrivacyLevel.GuildOnly,
      });

      await interaction.editReply(
        `Started Stage Instance in ${channel.name} with topic: "${topic}"`,
      );
    } catch (error) {
      console.error("Error starting Stage Instance:", error);
      await interaction.editReply(
        "Failed to start Stage Instance. Check my logs for details.",
      );
    }
  };
}
