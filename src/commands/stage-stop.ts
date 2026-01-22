// ABOUTME: Slash command to stop a Stage Instance
// ABOUTME: Ends the Stage Instance in the user's current Stage channel

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
} from "discord.js";
import { Command } from "./types";
import { isStageChannel, hasStagePermissions } from "../discord/stage";

export class StageStopCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("stage-stop")
    .setDescription("Ends the Stage Instance in your current Stage channel");

  execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    try {
      const member = interaction.member as GuildMember;
      const channel = member.voice.channel;

      if (!channel || !isStageChannel(channel)) {
        await interaction.editReply(
          "You must be in a Stage channel to end a Stage Instance.",
        );
        return;
      }

      if (!hasStagePermissions(member)) {
        await interaction.editReply(
          "You don't have permission to manage Stage Instances.",
        );
        return;
      }

      if (!channel.stageInstance) {
        await interaction.editReply(
          `${channel.name} has no active Stage Instance.`,
        );
        return;
      }

      await channel.stageInstance.delete();

      await interaction.editReply(
        `Ended Stage Instance in ${channel.name}.`,
      );
    } catch (error) {
      console.error("Error ending Stage Instance:", error);
      await interaction.editReply(
        "Failed to end Stage Instance. Check my logs for details.",
      );
    }
  };
}
