// ABOUTME: Unit tests for interaction handler
// ABOUTME: Tests routing of slash command interactions to handlers

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction, CacheType } from "discord.js";
import { CommandRegistry } from "../../../src/commands/registry";
import type { Command } from "../../../src/commands/types";

function createMockInteraction(
  commandName: string,
): ChatInputCommandInteraction<CacheType> {
  return {
    isChatInputCommand: () => true,
    commandName,
    reply: vi.fn().mockResolvedValue(undefined),
    user: { id: "123", username: "testuser" },
  } as unknown as ChatInputCommandInteraction<CacheType>;
}

describe("Interaction Handler", () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe("handleInteraction", () => {
    it("should execute registered command", async () => {
      const { handleInteraction } =
        await import("../../../src/commands/registry");

      const executeMock = vi.fn();
      const testCommand: Command = {
        data: new SlashCommandBuilder()
          .setName("test")
          .setDescription("Test command"),
        execute: executeMock,
      };
      registry.register(testCommand);

      const interaction = createMockInteraction("test");
      await handleInteraction(registry, interaction);

      expect(executeMock).toHaveBeenCalledWith(interaction);
    });

    it("should reply with error for unregistered command", async () => {
      const { handleInteraction } =
        await import("../../../src/commands/registry");

      const interaction = createMockInteraction("unknown");
      await handleInteraction(registry, interaction);

      expect(interaction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining("not found"),
        ephemeral: true,
      });
    });

    it("should handle command execution errors gracefully", async () => {
      const { handleInteraction } =
        await import("../../../src/commands/registry");

      const errorCommand: Command = {
        data: new SlashCommandBuilder()
          .setName("failing")
          .setDescription("Failing command"),
        execute: vi.fn().mockRejectedValue(new Error("Command failed")),
      };
      registry.register(errorCommand);

      const interaction = createMockInteraction("failing");
      await handleInteraction(registry, interaction);

      expect(interaction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining("error"),
        ephemeral: true,
      });
    });
  });
});
