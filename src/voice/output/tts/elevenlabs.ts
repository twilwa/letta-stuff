import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "stream";
import { loadConfig } from "../../../config";
import { TTSProvider, TTSOptions } from "./types";
import { AudioSegment } from "../types";

export class ElevenLabsTTS implements TTSProvider {
  private client: ElevenLabsClient;
  private defaultVoiceId: string;
  private defaultModelId = "eleven_monolingual_v1";

  constructor(apiKey?: string, defaultVoiceId?: string) {
    const config = loadConfig();
    const key = apiKey || config.tts.elevenLabsApiKey;

    if (!key) {
      throw new Error("ElevenLabs API key is required");
    }
    this.client = new ElevenLabsClient({ apiKey: key });
    this.defaultVoiceId = defaultVoiceId || "JBFqnCBsd6RMkjVDRZzb";
  }

  async synthesize(text: string, options?: TTSOptions): Promise<AudioSegment> {
    const voiceId = options?.voiceId || this.defaultVoiceId;
    const modelId = options?.modelId || this.defaultModelId;
    const startTime = Date.now();

    try {
      const audioStream = await this.client.textToSpeech.convert(voiceId, {
        text,
        modelId,
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.75,
        },
      });

      return {
        data: audioStream as unknown as Readable,
        streaming: true,
        text,
        requestedAt: startTime,
        voice: voiceId,
      };
    } catch (error) {
      throw new Error(
        `ElevenLabs synthesis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
