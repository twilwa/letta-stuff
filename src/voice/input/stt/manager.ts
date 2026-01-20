// ABOUTME: STTManager coordinates speech-to-text with speaker attribution
// ABOUTME: Routes per-user audio to Deepgram and emits attributed transcripts

import { EventEmitter } from "events";
import { DeepgramSTT } from "./deepgram.js";
import type { TranscriptionEvent } from "./types.js";

export interface STTManagerConfig {
  model?: string;
  language?: string;
  interimResults?: boolean;
}

export interface STTManagerEvents {
  transcript: (event: TranscriptionEvent) => void;
  finalTranscript: (event: TranscriptionEvent) => void;
  error: (error: Error, userId?: string) => void;
  userConnected: (userId: string) => void;
  userDisconnected: (userId: string) => void;
}

export interface STTMetrics {
  transcriptCount: number;
  averageLatency: number;
  activeUsers: number;
}

interface UserSTTClient {
  client: DeepgramSTT;
  lastAudioTime?: number;
}

export declare interface STTManager {
  on<K extends keyof STTManagerEvents>(
    event: K,
    listener: STTManagerEvents[K],
  ): this;
  emit<K extends keyof STTManagerEvents>(
    event: K,
    ...args: Parameters<STTManagerEvents[K]>
  ): boolean;
}

export class STTManager extends EventEmitter {
  private config: STTManagerConfig;
  private userClients: Map<string, UserSTTClient> = new Map();
  private transcriptCount = 0;
  private latencies: number[] = [];

  constructor(config: STTManagerConfig = {}) {
    super();
    this.config = config;
  }

  async startUser(userId: string): Promise<void> {
    if (this.userClients.has(userId)) {
      return;
    }

    const client = new DeepgramSTT({
      model: this.config.model,
      language: this.config.language,
      interimResults: this.config.interimResults,
    });

    this.setupClientListeners(client, userId);

    await client.start();

    this.userClients.set(userId, { client });
    this.emit("userConnected", userId);
  }

  private setupClientListeners(client: DeepgramSTT, userId: string): void {
    client.on("transcription", (event: TranscriptionEvent) => {
      const userClient = this.userClients.get(userId);
      if (userClient?.lastAudioTime) {
        const latency = Date.now() - userClient.lastAudioTime;
        this.latencies.push(latency);
        userClient.lastAudioTime = undefined;
      }

      this.transcriptCount++;

      const attributedEvent: TranscriptionEvent = {
        ...event,
        userId,
      };

      this.emit("transcript", attributedEvent);

      if (event.isFinal) {
        this.emit("finalTranscript", attributedEvent);
      }
    });

    client.on("error", (error: Error) => {
      this.emit("error", error, userId);
    });
  }

  stopUser(userId: string): void {
    const userClient = this.userClients.get(userId);
    if (!userClient) {
      return;
    }

    userClient.client.stop();
    this.userClients.delete(userId);
    this.emit("userDisconnected", userId);
  }

  sendAudio(userId: string, buffer: Buffer): void {
    const userClient = this.userClients.get(userId);
    if (!userClient) {
      return;
    }

    userClient.lastAudioTime = Date.now();
    userClient.client.sendAudio(buffer);
  }

  getActiveUsers(): string[] {
    return Array.from(this.userClients.keys());
  }

  getMetrics(): STTMetrics {
    const averageLatency =
      this.latencies.length > 0
        ? this.latencies.reduce((sum, lat) => sum + lat, 0) /
          this.latencies.length
        : 0;

    return {
      transcriptCount: this.transcriptCount,
      averageLatency,
      activeUsers: this.userClients.size,
    };
  }

  destroy(): void {
    for (const [userId, userClient] of this.userClients.entries()) {
      userClient.client.destroy();
    }
    this.userClients.clear();
    this.removeAllListeners();
  }
}
