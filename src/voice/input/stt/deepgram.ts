import { EventEmitter } from "events";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { DeepgramClient, ListenLiveClient } from "@deepgram/sdk";
import { loadConfig } from "../../../config/index.js";
import { DEFAULT_STT_CONFIG } from "./types.js";
import type { STTClient, STTConfig, TranscriptionEvent } from "./types.js";

export class DeepgramSTT extends EventEmitter implements STTClient {
  private client: DeepgramClient;
  private connection: ListenLiveClient | null = null;
  private config: STTConfig;
  private isConnected = false;

  constructor(config: Partial<STTConfig> = {}) {
    super();
    this.config = { ...DEFAULT_STT_CONFIG, ...config };

    const apiKey = this.config.apiKey || loadConfig().stt.deepgramApiKey;
    if (!apiKey) {
      throw new Error("Deepgram API key is required");
    }

    this.client = createClient(apiKey);
  }

  async start(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    this.connection = this.client.listen.live({
      model: this.config.model,
      language: this.config.language,
      encoding: this.config.encoding,
      sample_rate: this.config.sampleRate,
      channels: this.config.channels,
      interim_results: this.config.interimResults,
      smart_format: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.connection) return;

    this.connection.on(LiveTranscriptionEvents.Open, () => {
      this.isConnected = true;
      this.emit("open");
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      this.isConnected = false;
      this.emit("close");
    });

    this.connection.on(LiveTranscriptionEvents.Error, (error) => {
      this.emit("error", error);
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const alternative = data.channel?.alternatives?.[0];
      if (!alternative || !alternative.transcript) {
        return;
      }

      const event: TranscriptionEvent = {
        text: alternative.transcript,
        isFinal: data.is_final || false,
        confidence: alternative.confidence || 0,
      };

      this.emit("transcription", event);
    });
  }

  stop(): void {
    if (this.connection) {
      this.connection.requestClose();
      this.connection = null;
      this.isConnected = false;
    }
  }

  sendAudio(buffer: Buffer): void {
    if (this.isConnected && this.connection) {
      this.connection.send(buffer as any);
    }
  }

  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}
