// ABOUTME: AudioQueue for managing FIFO audio playback queue
// ABOUTME: Handles enqueue, dequeue, clear operations with event emission

import { EventEmitter } from "events";
import type { AudioSegment, QueueItem } from "./types.js";

export interface AudioQueueEvents {
  queueEmpty: () => void;
}

export class AudioQueue extends EventEmitter {
  private queue: QueueItem[] = [];

  /**
   * Add audio segment to the end of the queue
   */
  enqueue(segment: AudioSegment): void {
    const item: QueueItem = {
      segment,
      enqueuedAt: Date.now(),
    };
    this.queue.push(item);
  }

  /**
   * Remove and return the first item from the queue
   * Emits 'queueEmpty' event when last item is dequeued
   */
  dequeue(): QueueItem | undefined {
    const item = this.queue.shift();

    if (this.queue.length === 0 && item !== undefined) {
      this.emit("queueEmpty");
    }

    return item;
  }

  /**
   * View the first item without removing it
   */
  peek(): QueueItem | undefined {
    return this.queue[0];
  }

  /**
   * Remove all items from the queue
   * Emits 'queueEmpty' event if queue was not empty
   */
  clear(): void {
    const wasNotEmpty = this.queue.length > 0;
    this.queue = [];

    if (wasNotEmpty) {
      this.emit("queueEmpty");
    }
  }

  /**
   * Get the number of items in the queue
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if the queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get all items in the queue without modifying it
   */
  getAll(): QueueItem[] {
    return [...this.queue];
  }
}
