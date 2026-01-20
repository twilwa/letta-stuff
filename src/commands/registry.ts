// ABOUTME: Registry for Discord slash commands
// ABOUTME: Collects commands and provides data for Discord API registration

import {
  Collection,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import type { Command } from "./types";

export class CommandRegistry {
  private commands: Collection<string, Command> = new Collection();

  register(command: Command): void {
    this.commands.set(command.data.name, command);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  get size(): number {
    return this.commands.size;
  }

  getCommandData(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    return this.commands.map((cmd) => cmd.data.toJSON());
  }
}

export async function handleInteraction(
  registry: CommandRegistry,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const command = registry.get(interaction.commandName);

  if (!command) {
    await interaction.reply({
      content: `Command "${interaction.commandName}" not found.`,
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    await interaction.reply({
      content: "An error occurred while executing this command.",
      ephemeral: true,
    });
  }
}
