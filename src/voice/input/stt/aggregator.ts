// ABOUTME: TranscriptAggregator buffers and merges partial transcripts
// ABOUTME: Handles multi-user speech and emits complete utterances

import { EventEmitter } from "node:events";
import type { TranscriptionEvent } from "./types";

export interface AggregatorConfig {
  flushTimeout?: number;
  minConfidence?: number;
  maxBufferSize?: number;
}

export interface AggregatedTranscript {
  userId: string;
  text: string;
  confidence: number;
  startTime: number;
  endTime: number;
  isFinal: boolean;
}

export interface ConversationTurn {
  userId: string;
  text: string;
  timestamp: number;
}

interface UserBuffer {
  text: string;
  confidence: number;
  startTime: number;
  timer?: NodeJS.Timeout;
}

export class TranscriptAggregator extends EventEmitter {
  private readonly config: Required<AggregatorConfig>;
  private readonly buffers: Map<string, UserBuffer>;
  private readonly conversationHistory: ConversationTurn[];

  constructor(config?: AggregatorConfig) {
    super();
    this.config = {
      flushTimeout: config?.flushTimeout ?? 2000,
      minConfidence: config?.minConfidence ?? 0,
      maxBufferSize: config?.maxBufferSize ?? 500,
    };
    this.buffers = new Map();
    this.conversationHistory = [];
  }

  process(event: TranscriptionEvent): void {
    const userId = event.userId ?? "unknown";

    if (event.confidence < this.config.minConfidence) {
      return;
    }

    if (event.isFinal) {
      this.processFinal(userId, event);
    } else {
      this.processPartial(userId, event);
    }
  }

  private processFinal(userId: string, event: TranscriptionEvent): void {
    const buffer = this.buffers.get(userId);
    const startTime = buffer?.startTime ?? Date.now();
    const endTime = Date.now();

    this.clearTimer(userId);

    const aggregated: AggregatedTranscript = {
      userId,
      text: event.text,
      confidence: event.confidence,
      startTime,
      endTime,
      isFinal: true,
    };

    this.buffers.delete(userId);

    this.emit("utterance", aggregated);

    const turn: ConversationTurn = {
      userId,
      text: event.text,
      timestamp: endTime,
    };

    this.conversationHistory.push(turn);
    this.emit("turn", turn);
  }

  private processPartial(userId: string, event: TranscriptionEvent): void {
    const existingBuffer = this.buffers.get(userId);
    const startTime = existingBuffer?.startTime ?? Date.now();

    this.clearTimer(userId);

    this.buffers.set(userId, {
      text: event.text,
      confidence: event.confidence,
      startTime,
    });

    if (event.text.length > this.config.maxBufferSize) {
      this.flushUser(userId);
      return;
    }

    const timer = setTimeout(() => {
      this.flushUser(userId);
    }, this.config.flushTimeout);

    const buffer = this.buffers.get(userId);
    if (buffer) {
      buffer.timer = timer;
    }

    this.checkOverlap();
  }

  private flushUser(userId: string): void {
    const buffer = this.buffers.get(userId);
    if (!buffer) {
      return;
    }

    this.clearTimer(userId);

    const aggregated: AggregatedTranscript = {
      userId,
      text: buffer.text,
      confidence: buffer.confidence,
      startTime: buffer.startTime,
      endTime: Date.now(),
      isFinal: false,
    };

    this.buffers.delete(userId);

    this.emit("utterance", aggregated);

    const turn: ConversationTurn = {
      userId,
      text: buffer.text,
      timestamp: aggregated.endTime,
    };

    this.conversationHistory.push(turn);
    this.emit("turn", turn);
  }

  private clearTimer(userId: string): void {
    const buffer = this.buffers.get(userId);
    if (buffer?.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = undefined;
    }
  }

  private checkOverlap(): void {
    const activeUsers = Array.from(this.buffers.keys());
    if (activeUsers.length > 1) {
      this.emit("overlap", { userIds: activeUsers });
    }
  }

  flush(): AggregatedTranscript[] {
    const results: AggregatedTranscript[] = [];

    for (const userId of this.buffers.keys()) {
      const buffer = this.buffers.get(userId);
      if (buffer) {
        const aggregated: AggregatedTranscript = {
          userId,
          text: buffer.text,
          confidence: buffer.confidence,
          startTime: buffer.startTime,
          endTime: Date.now(),
          isFinal: false,
        };

        results.push(aggregated);
        this.emit("utterance", aggregated);

        const turn: ConversationTurn = {
          userId,
          text: buffer.text,
          timestamp: aggregated.endTime,
        };

        this.conversationHistory.push(turn);
        this.emit("turn", turn);
      }
    }

    for (const userId of this.buffers.keys()) {
      this.clearTimer(userId);
    }

    this.buffers.clear();

    return results;
  }

  getPending(userId: string): string {
    return this.buffers.get(userId)?.text ?? "";
  }

  getConversationHistory(limit?: number): ConversationTurn[] {
    if (limit === undefined) {
      return [...this.conversationHistory];
    }

    const startIndex = Math.max(0, this.conversationHistory.length - limit);
    return this.conversationHistory.slice(startIndex);
  }

  clear(): void {
    for (const userId of this.buffers.keys()) {
      this.clearTimer(userId);
    }

    this.buffers.clear();
    this.conversationHistory.length = 0;
  }

  destroy(): void {
    this.clear();
    this.removeAllListeners();
  }
}
