// ABOUTME: Unit tests for slash command registry
// ABOUTME: Tests command collection, retrieval, and Discord registration

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlashCommandBuilder, Collection } from "discord.js";
import type { Command } from "../../../src/commands/types";

describe("Command Registry", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("CommandRegistry", () => {
    it("should register a command", async () => {
      const { CommandRegistry } =
        await import("../../../src/commands/registry");

      const registry = new CommandRegistry();
      const testCommand: Command = {
        data: new SlashCommandBuilder()
          .setName("test")
          .setDescription("A test command"),
        execute: async () => {},
      };

      registry.register(testCommand);

      expect(registry.get("test")).toBe(testCommand);
    });

    it("should register multiple commands", async () => {
      const { CommandRegistry } =
        await import("../../../src/commands/registry");

      const registry = new CommandRegistry();
      const cmd1: Command = {
        data: new SlashCommandBuilder()
          .setName("cmd1")
          .setDescription("Command 1"),
        execute: async () => {},
      };
      const cmd2: Command = {
        data: new SlashCommandBuilder()
          .setName("cmd2")
          .setDescription("Command 2"),
        execute: async () => {},
      };

      registry.register(cmd1);
      registry.register(cmd2);

      expect(registry.size).toBe(2);
      expect(registry.get("cmd1")).toBe(cmd1);
      expect(registry.get("cmd2")).toBe(cmd2);
    });

    it("should overwrite existing command with same name", async () => {
      const { CommandRegistry } =
        await import("../../../src/commands/registry");

      const registry = new CommandRegistry();
      const cmd1: Command = {
        data: new SlashCommandBuilder()
          .setName("test")
          .setDescription("Original"),
        execute: async () => {},
      };
      const cmd2: Command = {
        data: new SlashCommandBuilder()
          .setName("test")
          .setDescription("Updated"),
        execute: async () => {},
      };

      registry.register(cmd1);
      expect(registry.get("test")).toBe(cmd1);

      registry.register(cmd2);
      expect(registry.get("test")).toBe(cmd2);
      expect(registry.size).toBe(1);
    });

    it("should return undefined for unregistered command", async () => {
      const { CommandRegistry } =
        await import("../../../src/commands/registry");

      const registry = new CommandRegistry();

      expect(registry.get("nonexistent")).toBeUndefined();
    });

    it("should provide all command data for registration", async () => {
      const { CommandRegistry } =
        await import("../../../src/commands/registry");

      const registry = new CommandRegistry();
      const cmd: Command = {
        data: new SlashCommandBuilder()
          .setName("mycommand")
          .setDescription("My command"),
        execute: async () => {},
      };

      registry.register(cmd);
      const allData = registry.getCommandData();

      expect(allData).toHaveLength(1);
      expect(allData[0].name).toBe("mycommand");
    });

    it("should check if command exists", async () => {
      const { CommandRegistry } =
        await import("../../../src/commands/registry");

      const registry = new CommandRegistry();
      const cmd: Command = {
        data: new SlashCommandBuilder()
          .setName("exists")
          .setDescription("Exists"),
        execute: async () => {},
      };

      registry.register(cmd);

      expect(registry.has("exists")).toBe(true);
      expect(registry.has("notexists")).toBe(false);
    });
  });
});
