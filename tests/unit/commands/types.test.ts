// ABOUTME: Unit tests for slash command type definitions
// ABOUTME: Validates command structure and type safety

import { describe, it, expect } from "vitest";
import type { Command, CommandHandler } from "../../../src/commands/types";
import { SlashCommandBuilder } from "discord.js";

describe("Command Types", () => {
  describe("Command interface", () => {
    it("should define a command with data and execute function", () => {
      const mockCommand: Command = {
        data: new SlashCommandBuilder()
          .setName("test")
          .setDescription("A test command"),
        execute: async () => {},
      };

      expect(mockCommand.data).toBeDefined();
      expect(mockCommand.data.name).toBe("test");
      expect(mockCommand.execute).toBeInstanceOf(Function);
    });

    it("should support commands with options", () => {
      const mockCommand: Command = {
        data: new SlashCommandBuilder()
          .setName("join")
          .setDescription("Join a voice channel")
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("The channel to join")
              .setRequired(false),
          ) as SlashCommandBuilder,
        execute: async () => {},
      };

      expect(mockCommand.data.name).toBe("join");
      expect(mockCommand.data.options).toHaveLength(1);
    });
  });

  describe("CommandHandler type", () => {
    it("should accept interaction as parameter", () => {
      const handler: CommandHandler = async (interaction) => {
        expect(interaction).toBeDefined();
      };

      expect(handler).toBeInstanceOf(Function);
    });
  });
});
