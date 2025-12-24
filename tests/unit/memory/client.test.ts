// ABOUTME: Unit tests for Letta client wrapper
// ABOUTME: Tests client creation, configuration, and health check

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Letta Client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("createLettaClient", () => {
    it("should create client with provided base URL", async () => {
      const { createLettaClient } = await import("../../../src/memory/client");

      const client = createLettaClient({
        baseUrl: "http://localhost:8283",
      });

      expect(client).toBeDefined();
      expect(client.baseUrl).toBe("http://localhost:8283");
    });

    it("should use default base URL when not provided", async () => {
      const { createLettaClient } = await import("../../../src/memory/client");

      const client = createLettaClient({});

      expect(client.baseUrl).toBe("http://localhost:8283");
    });

    it("should include API key when provided", async () => {
      const { createLettaClient } = await import("../../../src/memory/client");

      const client = createLettaClient({
        baseUrl: "http://localhost:8283",
        apiKey: "test-api-key",
      });

      expect(client.apiKey).toBe("test-api-key");
    });
  });

  describe("getLettaClient", () => {
    it("should return singleton instance", async () => {
      // Set env vars for singleton
      process.env.LETTA_BASE_URL = "http://localhost:8283";

      const { getLettaClient } = await import("../../../src/memory/client");

      const client1 = getLettaClient();
      const client2 = getLettaClient();

      expect(client1).toBe(client2);
    });
  });
});
