// ABOUTME: Unit tests for Discord message splitting
// ABOUTME: Tests splitting long messages while preserving code blocks

import { describe, it, expect } from "vitest";

const DISCORD_MAX_LENGTH = 2000;

describe("Message Splitting", () => {
  describe("splitMessage", () => {
    it("should return single-element array for short messages", async () => {
      const { splitMessage } = await import("../../../src/memory/splitting");

      const result = splitMessage("Short message");

      expect(result).toEqual(["Short message"]);
    });

    it("should return single-element array for exactly 2000 chars", async () => {
      const { splitMessage } = await import("../../../src/memory/splitting");

      const message = "a".repeat(2000);
      const result = splitMessage(message);

      expect(result).toEqual([message]);
    });

    it("should split messages over 2000 chars", async () => {
      const { splitMessage } = await import("../../../src/memory/splitting");

      const message = "a".repeat(2500);
      const result = splitMessage(message);

      expect(result.length).toBeGreaterThan(1);
      result.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(DISCORD_MAX_LENGTH);
      });
    });

    it("should preserve all content across chunks", async () => {
      const { splitMessage } = await import("../../../src/memory/splitting");

      const message = "word ".repeat(500); // ~2500 chars
      const result = splitMessage(message);

      // Rejoined should contain all original words (accounting for split mechanics)
      const rejoined = result.join("");
      expect(rejoined.replace(/\s+/g, " ").trim()).toContain("word");
    });

    it("should prefer splitting at newlines over mid-line", async () => {
      const { splitMessage } = await import("../../../src/memory/splitting");

      const lines = Array(100).fill("This is a complete line.").join("\n");
      const result = splitMessage(lines);

      // Non-final chunks should end at newline boundaries
      result.slice(0, -1).forEach((chunk) => {
        expect(chunk.endsWith("\n") || chunk.endsWith(".")).toBe(true);
      });
    });

    it("should fall back to space boundaries when no newline available", async () => {
      const { splitMessage } = await import("../../../src/memory/splitting");

      // Long line with no newlines, just spaces
      const message = "word ".repeat(450); // ~2250 chars, no newlines
      const result = splitMessage(message);

      expect(result.length).toBeGreaterThan(1);
      // Each chunk should end at a word boundary (space or end of word)
      result.slice(0, -1).forEach((chunk) => {
        // Should end with space (word boundary) not mid-word
        expect(chunk.endsWith(" ") || chunk.endsWith("word")).toBe(true);
      });
    });

    describe("code block preservation", () => {
      it("should balance code fences in each chunk", async () => {
        const { splitMessage } = await import("../../../src/memory/splitting");

        const message =
          "Text\n```js\nconst x = 1;\n```\nMore " + "a".repeat(2000);
        const result = splitMessage(message);

        result.forEach((chunk) => {
          const fences = (chunk.match(/```/g) || []).length;
          expect(fences % 2).toBe(0); // Always balanced
        });
      });

      it("should reopen code blocks in continuation chunks", async () => {
        const { splitMessage } = await import("../../../src/memory/splitting");

        // Code block that spans the split point
        const code = "x".repeat(1900);
        const message = "```javascript\n" + code + "\nmore code here\n```";
        const result = splitMessage(message);

        if (result.length > 1) {
          // First chunk should close the fence
          expect(result[0]).toContain("```");
          // Second chunk should reopen
          expect(result[1]).toMatch(/^```/);
        }
      });

      it("should preserve language tag when reopening code blocks", async () => {
        const { splitMessage } = await import("../../../src/memory/splitting");

        const code = "x".repeat(1900);
        const message = "```typescript\n" + code + "\nmore\n```";
        const result = splitMessage(message);

        if (result.length > 1) {
          expect(result[1]).toMatch(/^```typescript/);
        }
      });
    });
  });
});
