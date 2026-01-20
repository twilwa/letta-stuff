// ABOUTME: Bridges audio input to STT for voice transcription
// ABOUTME: Coordinates transform pipeline, STT manager, and transcript aggregation

import { EventEmitter } from "events";
import type { AudioInputManager } from "./audio-input-manager.js";
import { AudioTransformPipeline } from "../transform/index.js";
import { STTManager } from "./stt/manager.js";
import { TranscriptAggregator } from "./stt/aggregator.js";
import type { TranscriptionEvent } from "./stt/types.js";
import type {
  AggregatedTranscript,
  ConversationTurn,
} from "./stt/aggregator.js";

export interface STTInputBridgeConfig {
  model?: string;
  language?: string;
  flushTimeout?: number;
  sttManager?: STTManager;
  transformPipeline?: AudioTransformPipeline;
  aggregator?: TranscriptAggregator;
}

export interface STTInputBridgeEvents {
  transcript: (event: TranscriptionEvent) => void;
  utterance: (aggregated: AggregatedTranscript) => void;
  turn: (turn: ConversationTurn) => void;
  overlap: (data: { userIds: string[] }) => void;
  error: (error: Error, userId?: string) => void;
}

export declare interface STTInputBridge {
  on<K extends keyof STTInputBridgeEvents>(
    event: K,
    listener: STTInputBridgeEvents[K],
  ): this;
  emit<K extends keyof STTInputBridgeEvents>(
    event: K,
    ...args: Parameters<STTInputBridgeEvents[K]>
  ): boolean;
}

export class STTInputBridge extends EventEmitter {
  private audioInputManager: AudioInputManager;
  private transformPipeline: AudioTransformPipeline;
  private sttManager: STTManager;
  private aggregator: TranscriptAggregator;
  private activeUsers: Set<string> = new Set();
  private audioHandlers: Map<
    string,
    (userId: string, chunk: Buffer, timestamp: number) => void
  > = new Map();

  constructor(
    audioInputManager: AudioInputManager,
    config?: STTInputBridgeConfig,
  ) {
    super();
    this.audioInputManager = audioInputManager;

    this.transformPipeline =
      config?.transformPipeline ??
      new AudioTransformPipeline({
        inputSampleRate: 48000,
        outputSampleRate: 16000,
        inputChannels: 2,
        outputChannels: 1,
      });

    this.sttManager =
      config?.sttManager ??
      new STTManager({
        model: config?.model ?? "nova-2",
        language: config?.language ?? "en-US",
        interimResults: true,
      });

    this.aggregator =
      config?.aggregator ??
      new TranscriptAggregator({
        flushTimeout: config?.flushTimeout ?? 2000,
      });

    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    this.sttManager.on("transcript", (event: TranscriptionEvent) => {
      this.emit("transcript", event);
      this.aggregator.process(event);
    });

    this.sttManager.on("error", (error: Error, userId?: string) => {
      this.emit("error", error, userId);
    });

    this.aggregator.on("utterance", (aggregated: AggregatedTranscript) => {
      this.emit("utterance", aggregated);
    });

    this.aggregator.on("turn", (turn: ConversationTurn) => {
      this.emit("turn", turn);
    });

    this.aggregator.on("overlap", (data: { userIds: string[] }) => {
      this.emit("overlap", data);
    });
  }

  async startUser(userId: string): Promise<void> {
    if (this.activeUsers.has(userId)) {
      return;
    }

    await this.sttManager.startUser(userId);

    const audioHandler = (
      emittedUserId: string,
      chunk: Buffer,
      _timestamp: number,
    ) => {
      if (emittedUserId !== userId) {
        return;
      }

      const transformed = this.transformPipeline.transformPCM(chunk);
      this.sttManager.sendAudio(userId, transformed);
    };

    this.audioHandlers.set(userId, audioHandler);
    this.audioInputManager.on("audio", audioHandler);
    this.activeUsers.add(userId);
  }

  stopUser(userId: string): void {
    if (!this.activeUsers.has(userId)) {
      return;
    }

    this.sttManager.stopUser(userId);

    const audioHandler = this.audioHandlers.get(userId);
    if (audioHandler) {
      this.audioInputManager.off("audio", audioHandler);
      this.audioHandlers.delete(userId);
    }

    this.activeUsers.delete(userId);
  }

  async startAll(): Promise<void> {
    const speakers = this.audioInputManager.getCurrentSpeakers();
    for (const userId of speakers) {
      await this.startUser(userId);
    }
  }

  stopAll(): void {
    for (const userId of Array.from(this.activeUsers)) {
      this.stopUser(userId);
    }
  }

  getConversationHistory(limit?: number): ConversationTurn[] {
    return this.aggregator.getConversationHistory(limit);
  }

  getActiveUsers(): string[] {
    return Array.from(this.activeUsers);
  }

  destroy(): void {
    this.stopAll();
    this.sttManager.destroy();
    this.aggregator.destroy();
    this.removeAllListeners();
  }
}
