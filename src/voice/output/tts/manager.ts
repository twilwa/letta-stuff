// ABOUTME: TTSManager provides unified TTS with automatic provider fallback
// ABOUTME: Primary provider is Cartesia, falls back to ElevenLabs on failure

import { EventEmitter } from "events";
import { CartesiaTTS } from "./cartesia.js";
import { ElevenLabsTTS } from "./elevenlabs.js";
import { TTSProvider, TTSOptions } from "./types.js";
import type { AudioSegment } from "../types.js";

export interface TTSManagerConfig {
  /** Primary TTS provider to use */
  primaryProvider?: "cartesia" | "elevenlabs";
  /** Enable automatic fallback to secondary provider on failure */
  enableFallback?: boolean;
  /** Default voice ID to use if not specified in options */
  defaultVoice?: string;
  /** Default speech speed/rate if not specified in options */
  defaultSpeed?: number;
}

export interface TTSMetrics {
  /** Total number of synthesis requests */
  synthesisCount: number;
  /** Number of times fallback provider was used */
  fallbackCount: number;
  /** Average latency from request to first audio (ms) */
  averageLatency: number;
  /** Average time to first audio chunk (ms) */
  timeToFirstAudio: number;
}

interface TTSManagerEvents {
  /** Synthesis started */
  synthesisStarted: (text: string, provider: string) => void;
  /** Synthesis completed successfully */
  synthesisComplete: (text: string, provider: string, latency: number) => void;
  /** Fallback provider triggered due to primary failure */
  fallbackTriggered: (primaryError: Error, fallbackProvider: string) => void;
  /** Error during synthesis (after all providers failed) */
  error: (error: Error) => void;
}

export declare interface TTSManager {
  on<K extends keyof TTSManagerEvents>(
    event: K,
    listener: TTSManagerEvents[K],
  ): this;
  emit<K extends keyof TTSManagerEvents>(
    event: K,
    ...args: Parameters<TTSManagerEvents[K]>
  ): boolean;
}

export class TTSManager extends EventEmitter {
  private config: Required<TTSManagerConfig>;
  private primaryProvider?: TTSProvider;
  private fallbackProvider?: TTSProvider;
  private metrics: TTSMetrics;
  private latencySum: number = 0;
  private timeToFirstAudioSum: number = 0;

  constructor(config: TTSManagerConfig = {}) {
    super();
    this.config = {
      primaryProvider: config.primaryProvider || "cartesia",
      enableFallback: config.enableFallback ?? true,
      defaultVoice: config.defaultVoice || "",
      defaultSpeed: config.defaultSpeed || 1.0,
    };

    this.metrics = {
      synthesisCount: 0,
      fallbackCount: 0,
      averageLatency: 0,
      timeToFirstAudio: 0,
    };
  }

  /**
   * Synthesize text to speech with automatic provider fallback
   * @param text The text to convert to speech
   * @param options Optional configuration for this request
   * @returns AudioSegment with streaming data
   */
  async synthesize(
    text: string,
    options: TTSOptions = {},
  ): Promise<AudioSegment> {
    const startTime = Date.now();

    // Merge default options with provided options
    const mergedOptions: TTSOptions = {
      voiceId: options.voiceId || this.config.defaultVoice || undefined,
      speed: options.speed || this.config.defaultSpeed,
      modelId: options.modelId,
    };

    // Lazy-load primary provider
    if (!this.primaryProvider) {
      this.primaryProvider = this.createProvider(this.config.primaryProvider);
    }

    const primaryProviderName = this.config.primaryProvider;
    this.emit("synthesisStarted", text, primaryProviderName);

    try {
      const segment = await this.primaryProvider.synthesize(
        text,
        mergedOptions,
      );

      // Track metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(latency, false);
      this.emit("synthesisComplete", text, primaryProviderName, latency);

      return segment;
    } catch (primaryError) {
      // If fallback is disabled, throw immediately
      if (!this.config.enableFallback) {
        this.emit("error", primaryError as Error);
        throw primaryError;
      }

      // Try fallback provider
      const fallbackProviderName =
        this.config.primaryProvider === "cartesia" ? "elevenlabs" : "cartesia";

      this.emit(
        "fallbackTriggered",
        primaryError as Error,
        fallbackProviderName,
      );

      // Lazy-load fallback provider
      if (!this.fallbackProvider) {
        this.fallbackProvider = this.createProvider(fallbackProviderName);
      }

      try {
        const segment = await this.fallbackProvider.synthesize(
          text,
          mergedOptions,
        );

        // Track metrics with fallback flag
        const latency = Date.now() - startTime;
        this.updateMetrics(latency, true);
        this.emit("synthesisComplete", text, fallbackProviderName, latency);

        return segment;
      } catch (fallbackError) {
        // Both providers failed - create combined error
        const combinedError = new Error(
          `TTS synthesis failed with both providers. Primary (${primaryProviderName}): ${(primaryError as Error).message}. Fallback (${fallbackProviderName}): ${(fallbackError as Error).message}`,
        );

        this.emit("error", combinedError);
        throw combinedError;
      }
    }
  }

  /**
   * Get current synthesis metrics
   */
  getMetrics(): TTSMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics to zero
   */
  resetMetrics(): void {
    this.metrics = {
      synthesisCount: 0,
      fallbackCount: 0,
      averageLatency: 0,
      timeToFirstAudio: 0,
    };
    this.latencySum = 0;
    this.timeToFirstAudioSum = 0;
  }

  /**
   * Create a TTS provider instance
   */
  private createProvider(providerName: "cartesia" | "elevenlabs"): TTSProvider {
    if (providerName === "cartesia") {
      return new CartesiaTTS(undefined, this.config.defaultVoice || undefined);
    } else {
      return new ElevenLabsTTS(
        undefined,
        this.config.defaultVoice || undefined,
      );
    }
  }

  private updateMetrics(latency: number, usedFallback: boolean): void {
    this.metrics.synthesisCount++;
    if (usedFallback) {
      this.metrics.fallbackCount++;
    }

    this.latencySum += latency;
    this.metrics.averageLatency = this.latencySum / this.metrics.synthesisCount;

    this.timeToFirstAudioSum += latency;
    this.metrics.timeToFirstAudio =
      this.timeToFirstAudioSum / this.metrics.synthesisCount;
  }
}
