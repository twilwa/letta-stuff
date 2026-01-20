// ABOUTME: Slash command to leave a voice/stage channel
// ABOUTME: Validates connection status and uses VoiceConnectionManager to disconnect

import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Command } from "./types";
import type { VoiceConnectionManager } from "../voice/connection";

export class LeaveCommand implements Command {
  data = new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Leaves the current voice or stage channel");

  constructor(private voiceManager: VoiceConnectionManager) {}

  execute = async (interaction: ChatInputCommandInteraction): Promise<void> => {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    if (!this.voiceManager.isConnected(interaction.guildId)) {
      await interaction.reply({
        content: "I am not currently in a voice channel.",
        ephemeral: true,
      });
      return;
    }

    try {
      this.voiceManager.leaveChannel(interaction.guildId);
      await interaction.reply({
        content: "Disconnected from voice channel.",
      });
    } catch (error) {
      console.error("Error leaving voice channel:", error);
      await interaction.reply({
        content: "Failed to leave the voice channel.",
        ephemeral: true,
      });
    }
  };
}
