// ABOUTME: Unit tests for Discord client setup and lifecycle
// ABOUTME: Tests client creation, intents, error handling, and graceful shutdown

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Client, IntentsBitField } from "discord.js";

describe("Discord Client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("createClient", () => {
    it("should create client with required gateway intents", async () => {
      const { createClient } = await import("../../src/discord/client");
      const client = createClient();

      expect(client).toBeInstanceOf(Client);
      expect(client.options.intents).toBeDefined();

      // Check that required intents are present by checking the bitfield
      const intents = new IntentsBitField(client.options.intents);
      expect(intents.has("Guilds")).toBe(true);
      expect(intents.has("GuildMessages")).toBe(true);
      expect(intents.has("MessageContent")).toBe(true);
      expect(intents.has("DirectMessages")).toBe(true);
      expect(intents.has("GuildVoiceStates")).toBe(true);
    });

    it("should not login automatically", async () => {
      const { createClient } = await import("../../src/discord/client");
      const client = createClient();

      expect(client.isReady()).toBe(false);
    });
  });
});
