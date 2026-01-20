// ABOUTME: Unit tests for configuration loading and validation
// ABOUTME: Tests environment variable parsing, validation, and error handling

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock dotenv/config to prevent .env from overwriting test env vars
vi.mock("dotenv/config", () => ({}));

describe("Config Loader", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules and process.env before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env after each test
    process.env = originalEnv;
  });

  describe("loadConfig", () => {
    it("should throw error when DISCORD_TOKEN is missing", async () => {
      delete process.env.DISCORD_TOKEN;
      process.env.APP_ID = "test-app-id";
      process.env.PUBLIC_KEY = "test-public-key";

      const { loadConfig } = await import("../../src/config");
      expect(() => loadConfig()).toThrow("DISCORD_TOKEN");
    });

    it("should throw error when APP_ID is missing", async () => {
      process.env.DISCORD_TOKEN = "test-token";
      delete process.env.APP_ID;
      process.env.PUBLIC_KEY = "test-public-key";

      const { loadConfig } = await import("../../src/config");
      expect(() => loadConfig()).toThrow("APP_ID");
    });

    it("should throw error when PUBLIC_KEY is missing", async () => {
      process.env.DISCORD_TOKEN = "test-token";
      process.env.APP_ID = "test-app-id";
      delete process.env.PUBLIC_KEY;

      const { loadConfig } = await import("../../src/config");
      expect(() => loadConfig()).toThrow("PUBLIC_KEY");
    });

    it("should load all required Discord config when env vars are set", async () => {
      process.env.DISCORD_TOKEN = "test-token";
      process.env.APP_ID = "test-app-id";
      process.env.PUBLIC_KEY = "test-public-key";

      const { loadConfig } = await import("../../src/config");
      const config = loadConfig();

      expect(config.discord.token).toBe("test-token");
      expect(config.discord.appId).toBe("test-app-id");
      expect(config.discord.publicKey).toBe("test-public-key");
    });

    it("should use default LETTA_BASE_URL when not provided", async () => {
      process.env.DISCORD_TOKEN = "test-token";
      process.env.APP_ID = "test-app-id";
      process.env.PUBLIC_KEY = "test-public-key";
      delete process.env.LETTA_BASE_URL;

      const { loadConfig } = await import("../../src/config");
      const config = loadConfig();

      expect(config.letta.baseUrl).toBe("http://localhost:8283");
    });

    it("should load custom LETTA_BASE_URL when provided", async () => {
      process.env.DISCORD_TOKEN = "test-token";
      process.env.APP_ID = "test-app-id";
      process.env.PUBLIC_KEY = "test-public-key";
      process.env.LETTA_BASE_URL = "http://custom:9000";

      const { loadConfig } = await import("../../src/config");
      const config = loadConfig();

      expect(config.letta.baseUrl).toBe("http://custom:9000");
    });

    it("should load LETTA_AGENT_ID when provided", async () => {
      process.env.DISCORD_TOKEN = "test-token";
      process.env.APP_ID = "test-app-id";
      process.env.PUBLIC_KEY = "test-public-key";
      process.env.LETTA_AGENT_ID = "agent-123";

      const { loadConfig } = await import("../../src/config");
      const config = loadConfig();

      expect(config.letta.agentId).toBe("agent-123");
    });
  });
});
