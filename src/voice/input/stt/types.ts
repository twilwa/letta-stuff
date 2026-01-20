import type { Buffer } from "node:buffer";

export interface STTConfig {
  apiKey?: string;
  model?: string;
  language?: string;
  encoding?: string;
  sampleRate?: number;
  channels?: number;
  interimResults?: boolean;
}

export interface TranscriptionEvent {
  text: string;
  isFinal: boolean;
  confidence: number;
  userId?: string;
}

export interface STTClientEvents {
  transcription: (event: TranscriptionEvent) => void;
  error: (error: Error) => void;
  open: () => void;
  close: () => void;
}

export interface STTClient {
  start(): Promise<void>;
  stop(): void;
  sendAudio(buffer: Buffer): void;
  destroy(): void;
}

export const DEFAULT_STT_CONFIG: STTConfig = {
  model: "nova-2",
  language: "en-US",
  encoding: "linear16", // linear16 is common for PCM
  sampleRate: 48000, // Discord is 48kHz
  channels: 1, // Usually mono for STT
  interimResults: true,
};
