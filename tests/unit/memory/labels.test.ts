// ABOUTME: Unit tests for memory block label generation
// ABOUTME: Tests label naming convention for per-user memory blocks

import { describe, it, expect } from "vitest";

describe("Block Labels", () => {
  describe("generateUserBlockLabel", () => {
    it("should generate correct label format for user block", async () => {
      const { generateUserBlockLabel } =
        await import("../../../src/memory/labels");

      const label = generateUserBlockLabel("agent-123", "456789012345678901");

      expect(label).toBe("/agent-123/discord/users/456789012345678901");
    });

    it("should handle different agent IDs", async () => {
      const { generateUserBlockLabel } =
        await import("../../../src/memory/labels");

      const label = generateUserBlockLabel("my-custom-agent", "123456789");

      expect(label).toBe("/my-custom-agent/discord/users/123456789");
    });
  });

  describe("parseUserBlockLabel", () => {
    it("should extract agent ID and user ID from valid label", async () => {
      const { parseUserBlockLabel } =
        await import("../../../src/memory/labels");

      const result = parseUserBlockLabel(
        "/agent-123/discord/users/456789012345678901",
      );

      expect(result).toEqual({
        agentId: "agent-123",
        userId: "456789012345678901",
      });
    });

    it("should return null for invalid label format", async () => {
      const { parseUserBlockLabel } =
        await import("../../../src/memory/labels");

      expect(parseUserBlockLabel("/invalid/format")).toBeNull();
      expect(parseUserBlockLabel("not-a-label")).toBeNull();
      expect(parseUserBlockLabel("")).toBeNull();
    });
  });
});
