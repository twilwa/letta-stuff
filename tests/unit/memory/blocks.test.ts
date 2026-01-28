// ABOUTME: Unit tests for memory block management
// ABOUTME: Tests block creation, attachment, and detachment operations

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Block Management", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("createUserBlockTemplate", () => {
    it("should create block with correct label format", async () => {
      const { createUserBlockTemplate } =
        await import("../../../src/memory/blocks");

      const block = createUserBlockTemplate("agent-123", "456789");

      expect(block.label).toBe("/agent-123/discord/users/456789");
    });

    it("should include Discord context in template value", async () => {
      const { createUserBlockTemplate } =
        await import("../../../src/memory/blocks");

      const block = createUserBlockTemplate("agent-123", "456789");

      expect(block.value).toContain("Discord User");
      expect(block.value).toContain("456789"); // User ID substituted
    });

    it("should set 5KB limit for user blocks", async () => {
      const { createUserBlockTemplate } =
        await import("../../../src/memory/blocks");

      const block = createUserBlockTemplate("agent-123", "456789");

      expect(block.limit).toBe(5000);
    });
  });

  describe("attachBlockToAgent", () => {
    it("should return true on successful attach", async () => {
      const { attachBlockToAgent } = await import("../../../src/memory/blocks");

      const mockClient = {
        agents: {
          blocks: {
            attach: vi.fn().mockResolvedValue({}),
          },
        },
      };

      const result = await attachBlockToAgent(mockClient, "agent-1", "block-1");

      expect(result).toBe(true);
      expect(mockClient.agents.blocks.attach).toHaveBeenCalledWith("agent-1", {
        blockId: "block-1",
      });
    });

    it("should treat 409 (already attached) as success", async () => {
      const { attachBlockToAgent } = await import("../../../src/memory/blocks");

      const mockClient = {
        agents: {
          blocks: {
            attach: vi.fn().mockRejectedValue({ status: 409 }),
          },
        },
      };

      const result = await attachBlockToAgent(mockClient, "agent-1", "block-1");

      expect(result).toBe(true); // Idempotent - already attached is fine
    });

    it("should rethrow non-409 errors", async () => {
      const { attachBlockToAgent } = await import("../../../src/memory/blocks");

      const mockClient = {
        agents: {
          blocks: {
            attach: vi
              .fn()
              .mockRejectedValue({ status: 500, message: "Server error" }),
          },
        },
      };

      await expect(
        attachBlockToAgent(mockClient, "agent-1", "block-1"),
      ).rejects.toEqual({ status: 500, message: "Server error" });
    });
  });

  describe("detachBlockFromAgent", () => {
    it("should return true on successful detach", async () => {
      const { detachBlockFromAgent } =
        await import("../../../src/memory/blocks");

      const mockClient = {
        agents: {
          blocks: {
            detach: vi.fn().mockResolvedValue({}),
          },
        },
      };

      const result = await detachBlockFromAgent(
        mockClient,
        "agent-1",
        "block-1",
      );

      expect(result).toBe(true);
      expect(mockClient.agents.blocks.detach).toHaveBeenCalledWith(
        "agent-1",
        "block-1",
      );
    });

    it("should treat 404 (not attached) as success", async () => {
      const { detachBlockFromAgent } =
        await import("../../../src/memory/blocks");

      const mockClient = {
        agents: {
          blocks: {
            detach: vi.fn().mockRejectedValue({ status: 404 }),
          },
        },
      };

      const result = await detachBlockFromAgent(
        mockClient,
        "agent-1",
        "block-1",
      );

      expect(result).toBe(true); // Idempotent - not attached is fine for detach
    });

    it("should rethrow non-404 errors", async () => {
      const { detachBlockFromAgent } =
        await import("../../../src/memory/blocks");

      const mockClient = {
        agents: {
          blocks: {
            detach: vi
              .fn()
              .mockRejectedValue({ status: 500, message: "Server error" }),
          },
        },
      };

      await expect(
        detachBlockFromAgent(mockClient, "agent-1", "block-1"),
      ).rejects.toEqual({ status: 500, message: "Server error" });
    });
  });

  describe("getOrCreateUserBlock", () => {
    it("should return existing block when found", async () => {
      const { getOrCreateUserBlock } =
        await import("../../../src/memory/blocks");

      const mockClient = {
        blocks: {
          list: vi.fn().mockResolvedValue([{ id: "existing-block-id" }]),
          create: vi.fn(),
        },
      };

      const result = await getOrCreateUserBlock(
        mockClient,
        "agent-1",
        "user-123",
      );

      expect(result).toEqual({ id: "existing-block-id", isNew: false });
      expect(mockClient.blocks.create).not.toHaveBeenCalled();
    });

    it("should create new block when none exists", async () => {
      const { getOrCreateUserBlock } =
        await import("../../../src/memory/blocks");

      const mockClient = {
        blocks: {
          list: vi.fn().mockResolvedValue([]), // Empty - no existing block
          create: vi.fn().mockResolvedValue({ id: "new-block-id" }),
        },
      };

      const result = await getOrCreateUserBlock(
        mockClient,
        "agent-1",
        "user-123",
      );

      expect(result).toEqual({ id: "new-block-id", isNew: true });
      expect(mockClient.blocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "/agent-1/discord/users/user-123",
          limit: 5000,
        }),
      );
    });

    it("should create new block when list throws", async () => {
      const { getOrCreateUserBlock } =
        await import("../../../src/memory/blocks");

      const mockClient = {
        blocks: {
          list: vi.fn().mockRejectedValue(new Error("Not found")),
          create: vi.fn().mockResolvedValue({ id: "new-block-id" }),
        },
      };

      const result = await getOrCreateUserBlock(
        mockClient,
        "agent-1",
        "user-123",
      );

      expect(result).toEqual({ id: "new-block-id", isNew: true });
    });
  });
});
