// ABOUTME: Slash command to promote a user to speaker in a Stage channel
// ABOUTME: Unsuppresses a user to allow them to speak on stage

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { Command } from "./types";
import { isStageChannel, hasStagePermissions } from "../discord/stage";

export class PromoteCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("promote")
    .setDescription("Promotes a user to speaker in your Stage channel")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to promote to speaker")
        .setRequired(true),
    );

  execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    try {
      const member = interaction.member as GuildMember;
      const channel = member.voice.channel;

      if (!channel || !isStageChannel(channel)) {
        await interaction.editReply(
          "You must be in a Stage channel to promote users.",
        );
        return;
      }

      if (!hasStagePermissions(member)) {
        await interaction.editReply(
          "You don't have permission to promote users to speaker.",
        );
        return;
      }

      const targetMember = interaction.options.getMember("user") as GuildMember | null;

      if (!targetMember || targetMember.voice.channel?.id !== channel.id) {
        await interaction.editReply(
          "That user is not in your Stage channel.",
        );
        return;
      }

      await targetMember.voice.setSuppressed(false);

      await interaction.editReply(
        `Promoted ${targetMember.displayName} to speaker in ${channel.name}.`,
      );
    } catch (error) {
      console.error("Error promoting user:", error);
      await interaction.editReply(
        "Failed to promote user. Check my logs for details.",
      );
    }
  };
}
