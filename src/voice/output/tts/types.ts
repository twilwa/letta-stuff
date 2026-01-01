import { AudioSegment } from "../types";

export interface TTSOptions {
  /** Voice ID to use for synthesis */
  voiceId?: string;
  /** Model ID to use (e.g. elevelabs-multilingual-v2) */
  modelId?: string;
  /** Speech rate/speed (provider dependent) */
  speed?: number;
}

export interface TTSProvider {
  /**
   * Synthesize text to speech
   * @param text The text to convert to speech
   * @param options Optional configuration for this request
   * @returns AudioSegment with data stream/buffer
   */
  synthesize(text: string, options?: TTSOptions): Promise<AudioSegment>;
}
