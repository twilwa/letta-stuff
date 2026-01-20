// ABOUTME: Unit tests for TTSManager
// ABOUTME: Verifies provider abstraction, fallback logic, and metrics tracking

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TTSManager } from "../../../../../src/voice/output/tts/manager.js";
import { CartesiaTTS } from "../../../../../src/voice/output/tts/cartesia.js";
import { ElevenLabsTTS } from "../../../../../src/voice/output/tts/elevenlabs.js";
import { Readable } from "stream";

vi.mock("../../../../../src/voice/output/tts/cartesia.js");
vi.mock("../../../../../src/voice/output/tts/elevenlabs.js");
vi.mock("../../../../../src/config/index.js", () => ({
  loadConfig: () => ({
    tts: {
      cartesiaApiKey: "test-cartesia-key",
      elevenLabsApiKey: "test-elevenlabs-key",
    },
  }),
}));

describe("TTSManager", () => {
  let mockCartesiaSynthesize: ReturnType<typeof vi.fn>;
  let mockElevenLabsSynthesize: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCartesiaSynthesize = vi.fn();
    mockElevenLabsSynthesize = vi.fn();

    (CartesiaTTS as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => ({
        synthesize: mockCartesiaSynthesize,
      }),
    );

    (ElevenLabsTTS as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => ({
        synthesize: mockElevenLabsSynthesize,
      }),
    );
  });

  describe("initialization", () => {
    it("should initialize with default config", () => {
      const manager = new TTSManager();
      const metrics = manager.getMetrics();

      expect(metrics.synthesisCount).toBe(0);
      expect(metrics.fallbackCount).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.timeToFirstAudio).toBe(0);
    });

    it("should initialize with custom config", () => {
      const manager = new TTSManager({
        primaryProvider: "elevenlabs",
        enableFallback: false,
        defaultVoice: "custom-voice",
        defaultSpeed: 1.5,
      });

      expect(manager).toBeDefined();
    });
  });

  describe("successful synthesis with primary provider", () => {
    it("should synthesize with Cartesia as primary provider", async () => {
      const manager = new TTSManager({ primaryProvider: "cartesia" });

      const mockStream = Readable.from(Buffer.from("audio data"));
      mockCartesiaSynthesize.mockResolvedValue({
        data: mockStream,
        streaming: true,
        text: "Hello world",
        requestedAt: Date.now(),
        voice: "test-voice",
      });

      const segment = await manager.synthesize("Hello world");

      expect(CartesiaTTS).toHaveBeenCalled();
      expect(mockCartesiaSynthesize).toHaveBeenCalledWith("Hello world", {
        voiceId: undefined,
        speed: 1.0,
        modelId: undefined,
      });
      expect(segment.text).toBe("Hello world");
      expect(segment.streaming).toBe(true);
    });

    it("should synthesize with ElevenLabs as primary provider", async () => {
      const manager = new TTSManager({ primaryProvider: "elevenlabs" });

      const mockStream = Readable.from(Buffer.from("audio data"));
      mockElevenLabsSynthesize.mockResolvedValue({
        data: mockStream,
        streaming: true,
        text: "Test message",
        requestedAt: Date.now(),
        voice: "test-voice",
      });

      const segment = await manager.synthesize("Test message");

      expect(ElevenLabsTTS).toHaveBeenCalled();
      expect(mockElevenLabsSynthesize).toHaveBeenCalledWith("Test message", {
        voiceId: undefined,
        speed: 1.0,
        modelId: undefined,
      });
      expect(segment.text).toBe("Test message");
    });

    it("should use default voice and speed from config", async () => {
      const manager = new TTSManager({
        defaultVoice: "my-voice",
        defaultSpeed: 1.2,
      });

      mockCartesiaSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test");

      expect(mockCartesiaSynthesize).toHaveBeenCalledWith("test", {
        voiceId: "my-voice",
        speed: 1.2,
        modelId: undefined,
      });
    });

    it("should override defaults with provided options", async () => {
      const manager = new TTSManager({
        defaultVoice: "default-voice",
        defaultSpeed: 1.0,
      });

      mockCartesiaSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test", {
        voiceId: "custom-voice",
        speed: 1.5,
        modelId: "custom-model",
      });

      expect(mockCartesiaSynthesize).toHaveBeenCalledWith("test", {
        voiceId: "custom-voice",
        speed: 1.5,
        modelId: "custom-model",
      });
    });
  });

  describe("fallback logic", () => {
    it("should fallback to ElevenLabs when Cartesia fails", async () => {
      const manager = new TTSManager({ primaryProvider: "cartesia" });

      const fallbackTriggeredSpy = vi.fn();
      manager.on("fallbackTriggered", fallbackTriggeredSpy);

      mockCartesiaSynthesize.mockRejectedValue(
        new Error("Cartesia connection failed"),
      );
      mockElevenLabsSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("fallback audio")),
        streaming: true,
        text: "Hello",
        voice: "fallback-voice",
      });

      const segment = await manager.synthesize("Hello");

      expect(mockCartesiaSynthesize).toHaveBeenCalled();
      expect(mockElevenLabsSynthesize).toHaveBeenCalled();
      expect(segment.text).toBe("Hello");
      expect(fallbackTriggeredSpy).toHaveBeenCalledWith(
        expect.any(Error),
        "elevenlabs",
      );
    });

    it("should fallback to Cartesia when ElevenLabs fails", async () => {
      const manager = new TTSManager({ primaryProvider: "elevenlabs" });

      const fallbackTriggeredSpy = vi.fn();
      manager.on("fallbackTriggered", fallbackTriggeredSpy);

      mockElevenLabsSynthesize.mockRejectedValue(
        new Error("ElevenLabs API error"),
      );
      mockCartesiaSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("fallback audio")),
        streaming: true,
        text: "Test",
        voice: "fallback-voice",
      });

      const segment = await manager.synthesize("Test");

      expect(mockElevenLabsSynthesize).toHaveBeenCalled();
      expect(mockCartesiaSynthesize).toHaveBeenCalled();
      expect(segment.text).toBe("Test");
      expect(fallbackTriggeredSpy).toHaveBeenCalledWith(
        expect.any(Error),
        "cartesia",
      );
    });

    it("should throw error when both providers fail", async () => {
      const manager = new TTSManager();

      const errorSpy = vi.fn();
      manager.on("error", errorSpy);

      mockCartesiaSynthesize.mockRejectedValue(
        new Error("Cartesia failed"),
      );
      mockElevenLabsSynthesize.mockRejectedValue(
        new Error("ElevenLabs failed"),
      );

      await expect(manager.synthesize("Test")).rejects.toThrow(
        /TTS synthesis failed with both providers/,
      );

      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should not fallback when fallback is disabled", async () => {
      const manager = new TTSManager({ enableFallback: false });

      const errorSpy = vi.fn();
      manager.on("error", errorSpy);

      mockCartesiaSynthesize.mockRejectedValue(
        new Error("Cartesia failed"),
      );

      await expect(manager.synthesize("Test")).rejects.toThrow(
        "Cartesia failed",
      );

      expect(mockCartesiaSynthesize).toHaveBeenCalled();
      expect(mockElevenLabsSynthesize).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("metrics tracking", () => {
    it("should track synthesis count", async () => {
      const manager = new TTSManager();

      mockCartesiaSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test 1");
      await manager.synthesize("test 2");
      await manager.synthesize("test 3");

      const metrics = manager.getMetrics();
      expect(metrics.synthesisCount).toBe(3);
    });

    it("should track fallback count", async () => {
      const manager = new TTSManager();

      mockCartesiaSynthesize
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce({
          data: Readable.from(Buffer.from("audio")),
          streaming: true,
          text: "test",
        })
        .mockRejectedValueOnce(new Error("fail"));

      mockElevenLabsSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test 1");
      await manager.synthesize("test 2");
      await manager.synthesize("test 3");

      const metrics = manager.getMetrics();
      expect(metrics.synthesisCount).toBe(3);
      expect(metrics.fallbackCount).toBe(2);
    });

    it("should track average latency", async () => {
      const manager = new TTSManager();

      mockCartesiaSynthesize.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          data: Readable.from(Buffer.from("audio")),
          streaming: true,
          text: "test",
        };
      });

      await manager.synthesize("test 1");
      await manager.synthesize("test 2");

      const metrics = manager.getMetrics();
      expect(metrics.averageLatency).toBeGreaterThan(0);
      expect(metrics.timeToFirstAudio).toBeGreaterThan(0);
    });

    it("should reset metrics", async () => {
      const manager = new TTSManager();

      mockCartesiaSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test");

      let metrics = manager.getMetrics();
      expect(metrics.synthesisCount).toBe(1);

      manager.resetMetrics();

      metrics = manager.getMetrics();
      expect(metrics.synthesisCount).toBe(0);
      expect(metrics.fallbackCount).toBe(0);
      expect(metrics.averageLatency).toBe(0);
      expect(metrics.timeToFirstAudio).toBe(0);
    });
  });

  describe("events", () => {
    it("should emit synthesisStarted event", async () => {
      const manager = new TTSManager();
      const spy = vi.fn();
      manager.on("synthesisStarted", spy);

      mockCartesiaSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test");

      expect(spy).toHaveBeenCalledWith("test", "cartesia");
    });

    it("should emit synthesisComplete event with latency", async () => {
      const manager = new TTSManager();
      const spy = vi.fn();
      manager.on("synthesisComplete", spy);

      mockCartesiaSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test");

      expect(spy).toHaveBeenCalledWith("test", "cartesia", expect.any(Number));
    });

    it("should emit fallbackTriggered event", async () => {
      const manager = new TTSManager();
      const spy = vi.fn();
      manager.on("fallbackTriggered", spy);

      mockCartesiaSynthesize.mockRejectedValue(new Error("Primary failed"));
      mockElevenLabsSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test");

      expect(spy).toHaveBeenCalledWith(expect.any(Error), "elevenlabs");
    });

    it("should emit error event when all providers fail", async () => {
      const manager = new TTSManager();
      const spy = vi.fn();
      manager.on("error", spy);

      mockCartesiaSynthesize.mockRejectedValue(new Error("fail"));
      mockElevenLabsSynthesize.mockRejectedValue(new Error("fail"));

      await expect(manager.synthesize("test")).rejects.toThrow();

      expect(spy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("lazy provider initialization", () => {
    it("should only create primary provider on first use", async () => {
      const manager = new TTSManager({ primaryProvider: "cartesia" });

      expect(CartesiaTTS).not.toHaveBeenCalled();
      expect(ElevenLabsTTS).not.toHaveBeenCalled();

      mockCartesiaSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test");

      expect(CartesiaTTS).toHaveBeenCalledTimes(1);
      expect(ElevenLabsTTS).not.toHaveBeenCalled();
    });

    it("should only create fallback provider when needed", async () => {
      const manager = new TTSManager({ primaryProvider: "cartesia" });

      mockCartesiaSynthesize.mockRejectedValue(new Error("fail"));
      mockElevenLabsSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test");

      expect(CartesiaTTS).toHaveBeenCalledTimes(1);
      expect(ElevenLabsTTS).toHaveBeenCalledTimes(1);
    });

    it("should reuse providers across multiple calls", async () => {
      const manager = new TTSManager();

      mockCartesiaSynthesize.mockResolvedValue({
        data: Readable.from(Buffer.from("audio")),
        streaming: true,
        text: "test",
      });

      await manager.synthesize("test 1");
      await manager.synthesize("test 2");
      await manager.synthesize("test 3");

      expect(CartesiaTTS).toHaveBeenCalledTimes(1);
    });
  });
});
