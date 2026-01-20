// ABOUTME: Type definitions for Discord slash commands
// ABOUTME: Defines Command interface and CommandHandler type for consistent command structure

import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";

export type CommandHandler = (
  interaction: ChatInputCommandInteraction,
) => Promise<void>;

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: CommandHandler;
}
