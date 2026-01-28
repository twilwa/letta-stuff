// ABOUTME: Cartesia TTS client wrapper for streaming audio output
// ABOUTME: Handles WebSocket connection and PCM stream conversion

import { Readable } from "stream";
import { CartesiaClient } from "@cartesia/cartesia-js";
import { loadConfig } from "../../../config/index.js";
import { TTSProvider, TTSOptions } from "./types.js";
import type { AudioSegment } from "../types.js";

const SAMPLE_RATE = 48000;
const ENCODING = "pcm_s16le";
const CONTAINER = "raw";
const DEFAULT_MODEL_ID = "sonic-english";

export interface CartesiaTTSConfig extends TTSOptions {}

interface CartesiaSource {
  read(dst: Int16Array | Float32Array | Uint8Array): Promise<number>;
  encoding: string;
  sampleRate: number;
}

class CartesiaAudioStream extends Readable {
  private source: CartesiaSource;
  private reading: boolean = false;
  private bytesPerSample: number;

  constructor(source: CartesiaSource) {
    super({ highWaterMark: 16 * 1024 });
    this.source = source;
    this.bytesPerSample = 2;
  }

  async _read(size: number) {
    if (this.reading) return;
    this.reading = true;

    try {
      const samplesToRead = Math.max(
        1024,
        Math.floor(size / this.bytesPerSample),
      );

      const buffer = new Int16Array(samplesToRead);

      const samplesRead = await this.source.read(buffer);

      if (samplesRead === 0) {
        this.push(null);
      } else {
        const byteLength = samplesRead * this.bytesPerSample;
        const byteBuffer = Buffer.from(buffer.buffer, 0, byteLength);

        this.push(Buffer.from(byteBuffer));
      }
    } catch (error) {
      this.destroy(error as Error);
    } finally {
      this.reading = false;
    }
  }
}

export class CartesiaTTS implements TTSProvider {
  private client: CartesiaClient;
  private defaultVoiceId: string;

  constructor(apiKey?: string, defaultVoiceId?: string) {
    const config = loadConfig();
    const key = apiKey || config.tts.cartesiaApiKey;

    if (!key) {
      throw new Error("Missing Cartesia API Key");
    }

    this.client = new CartesiaClient({ apiKey: key });
    this.defaultVoiceId =
      defaultVoiceId || "a0e99841-438c-4a64-b679-ae501e7d6091";
  }

  async synthesize(
    text: string,
    options: CartesiaTTSConfig = {},
  ): Promise<AudioSegment> {
    const start = Date.now();

    const websocket = this.client.tts.websocket({
      sampleRate: SAMPLE_RATE,
      encoding: ENCODING,
      container: CONTAINER,
    });

    try {
      await websocket.connect();
    } catch (error) {
      throw new Error(
        `Failed to connect to Cartesia TTS: ${(error as Error).message}`,
      );
    }

    const response = await websocket.send({
      modelId: options.modelId || DEFAULT_MODEL_ID,
      transcript: text,
      voice: {
        mode: "id",
        id: options.voiceId || this.defaultVoiceId,
      },
    });

    const stream = new CartesiaAudioStream(
      response.source as unknown as CartesiaSource,
    );

    stream.on("close", () => {
      websocket.disconnect();
    });

    return {
      data: stream,
      streaming: true,
      text,
      requestedAt: start,
      voice: options.voiceId || this.defaultVoiceId,
    };
  }
}
