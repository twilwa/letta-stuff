// ABOUTME: Tests for AudioBuffer ring buffer implementation
// ABOUTME: Verifies packet storage, overflow handling, and sliding window retrieval

import { describe, it, expect, beforeEach } from "vitest";
import { AudioBuffer } from "../../../src/voice/input/audio-buffer.js";
import { createOpusPacket, createOpusPacketSequence } from "./fixtures/opus.js";

describe("AudioBuffer", () => {
  describe("Construction", () => {
    it("should create buffer with default capacity", () => {
      const buffer = new AudioBuffer();
      expect(buffer.size).toBe(0);
      expect(buffer.capacity).toBeGreaterThan(0);
    });

    it("should create buffer with custom capacity", () => {
      const buffer = new AudioBuffer({ capacity: 100 });
      expect(buffer.capacity).toBe(100);
      expect(buffer.size).toBe(0);
    });

    it("should handle zero capacity", () => {
      const buffer = new AudioBuffer({ capacity: 0 });
      expect(buffer.capacity).toBe(0);
      expect(buffer.size).toBe(0);
    });

    it("should calculate capacity from time-based config", () => {
      // 5 seconds at 50 packets/sec (20ms frames) = 250 packets
      const buffer = new AudioBuffer({
        bufferSeconds: 5,
        frameDurationMs: 20,
      });
      expect(buffer.capacity).toBe(250);
    });
  });

  describe("Adding packets", () => {
    let buffer: AudioBuffer;

    beforeEach(() => {
      buffer = new AudioBuffer({ capacity: 5 });
    });

    it("should add packet and increment size", () => {
      const packet = createOpusPacket();
      buffer.push(packet);

      expect(buffer.size).toBe(1);
    });

    it("should add multiple packets", () => {
      const packets = createOpusPacketSequence(3);

      packets.forEach((p) => buffer.push(p.data, p.timestamp));

      expect(buffer.size).toBe(3);
    });

    it("should store packet with timestamp", () => {
      const packet = createOpusPacket();
      const timestamp = Date.now();

      buffer.push(packet, timestamp);

      const retrieved = buffer.getAll();
      expect(retrieved[0].timestamp).toBe(timestamp);
      expect(retrieved[0].data).toEqual(packet);
    });

    it("should auto-generate timestamp if not provided", () => {
      const before = Date.now();
      buffer.push(createOpusPacket());
      const after = Date.now();

      const retrieved = buffer.getAll();
      expect(retrieved[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(retrieved[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("Overflow handling", () => {
    let buffer: AudioBuffer;

    beforeEach(() => {
      buffer = new AudioBuffer({ capacity: 3 });
    });

    it("should drop oldest packet on overflow", () => {
      const packets = createOpusPacketSequence(5);

      packets.forEach((p) => buffer.push(p.data, p.timestamp));

      // Should only keep last 3 packets
      expect(buffer.size).toBe(3);

      const retrieved = buffer.getAll();
      expect(retrieved[0].timestamp).toBe(packets[2].timestamp);
      expect(retrieved[1].timestamp).toBe(packets[3].timestamp);
      expect(retrieved[2].timestamp).toBe(packets[4].timestamp);
    });

    it("should handle continuous overflow", () => {
      const packets = createOpusPacketSequence(100);

      packets.forEach((p) => buffer.push(p.data, p.timestamp));

      expect(buffer.size).toBe(3);

      // Should have last 3 packets
      const retrieved = buffer.getAll();
      expect(retrieved[0].timestamp).toBe(packets[97].timestamp);
      expect(retrieved[1].timestamp).toBe(packets[98].timestamp);
      expect(retrieved[2].timestamp).toBe(packets[99].timestamp);
    });

    it("should handle overflow with capacity of 1", () => {
      const smallBuffer = new AudioBuffer({ capacity: 1 });
      const packets = createOpusPacketSequence(3);

      packets.forEach((p) => smallBuffer.push(p.data, p.timestamp));

      expect(smallBuffer.size).toBe(1);

      const retrieved = smallBuffer.getAll();
      expect(retrieved[0].timestamp).toBe(packets[2].timestamp);
    });
  });

  describe("Retrieval", () => {
    let buffer: AudioBuffer;

    beforeEach(() => {
      buffer = new AudioBuffer({ capacity: 10 });
    });

    it("should return empty array when buffer is empty", () => {
      expect(buffer.getAll()).toEqual([]);
      expect(buffer.getWindow({ maxPackets: 5 })).toEqual([]);
    });

    it("should return all packets in order", () => {
      const packets = createOpusPacketSequence(5);
      packets.forEach((p) => buffer.push(p.data, p.timestamp));

      const retrieved = buffer.getAll();

      expect(retrieved.length).toBe(5);
      for (let i = 0; i < 5; i++) {
        expect(retrieved[i].timestamp).toBe(packets[i].timestamp);
      }
    });

    it("should return limited packets with maxPackets", () => {
      const packets = createOpusPacketSequence(10);
      packets.forEach((p) => buffer.push(p.data, p.timestamp));

      const retrieved = buffer.getWindow({ maxPackets: 3 });

      expect(retrieved.length).toBe(3);
      // Should return most recent 3
      expect(retrieved[0].timestamp).toBe(packets[7].timestamp);
      expect(retrieved[1].timestamp).toBe(packets[8].timestamp);
      expect(retrieved[2].timestamp).toBe(packets[9].timestamp);
    });

    it("should return packets within time window", () => {
      const now = Date.now();
      buffer.push(createOpusPacket(), now - 1000); // 1s ago
      buffer.push(createOpusPacket(), now - 500); // 500ms ago
      buffer.push(createOpusPacket(), now - 200); // 200ms ago
      buffer.push(createOpusPacket(), now); // now

      const retrieved = buffer.getWindow({ maxAgeMs: 600 });

      // Should only get packets from last 600ms
      expect(retrieved.length).toBe(3);
      expect(retrieved[0].timestamp).toBe(now - 500);
    });

    it("should handle both maxPackets and maxAgeMs constraints", () => {
      const now = Date.now();
      buffer.push(createOpusPacket(), now - 1000);
      buffer.push(createOpusPacket(), now - 500);
      buffer.push(createOpusPacket(), now - 400);
      buffer.push(createOpusPacket(), now - 300);
      buffer.push(createOpusPacket(), now - 200);
      buffer.push(createOpusPacket(), now);

      // Want max 3 packets, but only from last 600ms
      const retrieved = buffer.getWindow({ maxPackets: 3, maxAgeMs: 600 });

      // Should get 3 most recent packets within 600ms window
      expect(retrieved.length).toBe(3);
      expect(retrieved[0].timestamp).toBe(now - 300);
      expect(retrieved[1].timestamp).toBe(now - 200);
      expect(retrieved[2].timestamp).toBe(now);
    });
  });

  describe("Clear", () => {
    it("should clear all packets", () => {
      const buffer = new AudioBuffer({ capacity: 10 });
      const packets = createOpusPacketSequence(5);
      packets.forEach((p) => buffer.push(p.data, p.timestamp));

      expect(buffer.size).toBe(5);

      buffer.clear();

      expect(buffer.size).toBe(0);
      expect(buffer.getAll()).toEqual([]);
    });

    it("should allow adding after clear", () => {
      const buffer = new AudioBuffer({ capacity: 5 });
      createOpusPacketSequence(3).forEach((p) =>
        buffer.push(p.data, p.timestamp),
      );

      buffer.clear();

      const newPacket = createOpusPacket();
      buffer.push(newPacket);

      expect(buffer.size).toBe(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero capacity buffer", () => {
      const buffer = new AudioBuffer({ capacity: 0 });
      buffer.push(createOpusPacket());

      expect(buffer.size).toBe(0);
      expect(buffer.getAll()).toEqual([]);
    });

    it("should handle very large packets", () => {
      const buffer = new AudioBuffer({ capacity: 5 });
      const largePacket = createOpusPacket(1275);

      buffer.push(largePacket);

      const retrieved = buffer.getAll();
      expect(retrieved[0].data.length).toBe(1275);
    });

    it("should maintain order after wrapping around", () => {
      const buffer = new AudioBuffer({ capacity: 3 });
      const packets = createOpusPacketSequence(7);

      packets.forEach((p) => buffer.push(p.data, p.timestamp));

      const retrieved = buffer.getAll();

      // Should have packets 4, 5, 6 in order
      expect(retrieved.length).toBe(3);
      expect(retrieved[0].timestamp).toBeLessThan(retrieved[1].timestamp);
      expect(retrieved[1].timestamp).toBeLessThan(retrieved[2].timestamp);
    });
  });
});
