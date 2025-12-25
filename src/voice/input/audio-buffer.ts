// ABOUTME: Ring buffer for storing per-user Opus audio packets
// ABOUTME: Handles overflow by dropping oldest packets, supports sliding window retrieval

import type { AudioPacket, WindowOptions, AudioInputConfig } from "./types.js";

export class AudioBuffer {
  private buffer: AudioPacket[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;
  private readonly maxCapacity: number;

  constructor(config: AudioInputConfig = {}) {
    // Calculate capacity from time-based config or use direct capacity
    if (config.capacity !== undefined) {
      this.maxCapacity = config.capacity;
    } else {
      const bufferSeconds = config.bufferSeconds ?? 5;
      const frameDurationMs = config.frameDurationMs ?? 20;
      // packets = seconds / (frameDuration in seconds)
      this.maxCapacity = Math.floor((bufferSeconds * 1000) / frameDurationMs);
    }

    this.buffer = new Array(this.maxCapacity);
  }

  /**
   * Current number of packets in buffer
   */
  get size(): number {
    return this.count;
  }

  /**
   * Maximum buffer capacity
   */
  get capacity(): number {
    return this.maxCapacity;
  }

  /**
   * Add a packet to the buffer
   * If buffer is full, drops the oldest packet
   */
  push(data: Buffer, timestamp?: number): void {
    if (this.maxCapacity === 0) {
      return; // Zero capacity buffer, don't store anything
    }

    const packet: AudioPacket = {
      data,
      timestamp: timestamp ?? Date.now(),
    };

    if (this.count === this.maxCapacity) {
      // Buffer is full, drop oldest (advance head)
      this.head = (this.head + 1) % this.maxCapacity;
      this.count--;
    }

    this.buffer[this.tail] = packet;
    this.tail = (this.tail + 1) % this.maxCapacity;
    this.count++;
  }

  /**
   * Get all packets in chronological order
   */
  getAll(): AudioPacket[] {
    if (this.count === 0) {
      return [];
    }

    const result: AudioPacket[] = [];
    let index = this.head;

    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[index]);
      index = (index + 1) % this.maxCapacity;
    }

    return result;
  }

  /**
   * Get packets within a sliding window
   * Returns most recent packets that match the criteria
   */
  getWindow(options: WindowOptions = {}): AudioPacket[] {
    const all = this.getAll();

    if (all.length === 0) {
      return [];
    }

    let filtered = all;

    // Apply time window filter
    if (options.maxAgeMs !== undefined) {
      const cutoffTime = Date.now() - options.maxAgeMs;
      filtered = filtered.filter((p) => p.timestamp >= cutoffTime);
    }

    // Apply packet count limit (take most recent)
    if (
      options.maxPackets !== undefined &&
      filtered.length > options.maxPackets
    ) {
      filtered = filtered.slice(-options.maxPackets);
    }

    return filtered;
  }

  /**
   * Clear all packets from buffer
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    this.buffer = new Array(this.maxCapacity);
  }
}
