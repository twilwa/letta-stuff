import { describe, it, expect, vi, beforeEach } from "vitest";
import { ElevenLabsTTS } from "../../../../../src/voice/output/tts/elevenlabs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "stream";
import { loadConfig } from "../../../../../src/config";

// Mock the SDK
vi.mock("@elevenlabs/elevenlabs-js", () => {
  return {
    ElevenLabsClient: vi.fn().mockImplementation(() => ({
      textToSpeech: {
        convert: vi.fn(),
      },
    })),
  };
});

vi.mock("../../../../../src/config", () => ({
  loadConfig: vi.fn(),
}));

describe("ElevenLabsTTS", () => {
  const apiKey = "test-api-key";
  let tts: ElevenLabsTTS;

  beforeEach(() => {
    vi.clearAllMocks();
    (loadConfig as any).mockReturnValue({
      tts: { elevenLabsApiKey: apiKey },
    });
    tts = new ElevenLabsTTS();
  });

  it("should initialize with API key from config", () => {
    expect(ElevenLabsClient).toHaveBeenCalledWith({ apiKey });
  });

  it("should initialize with provided API key", () => {
    new ElevenLabsTTS("provided-key");
    expect(ElevenLabsClient).toHaveBeenCalledWith({ apiKey: "provided-key" });
  });

  it("should throw error if no API key provided", () => {
    (loadConfig as any).mockReturnValue({ tts: {} });
    expect(() => new ElevenLabsTTS()).toThrow("ElevenLabs API key is required");
  });

  it("should synthesize text and return audio segment", async () => {
    const text = "Hello world";
    const mockStream = new Readable();
    mockStream.push(null);

    const convertMock = vi.fn().mockResolvedValue(mockStream);
    (ElevenLabsClient as any).mockImplementation(() => ({
      textToSpeech: {
        convert: convertMock,
      },
    }));

    tts = new ElevenLabsTTS(apiKey);

    const result = await tts.synthesize(text);

    expect(convertMock).toHaveBeenCalledWith(
      expect.any(String), // voiceId
      expect.objectContaining({
        text,
        modelId: expect.any(String),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        streaming: true,
        text,
        data: mockStream,
      }),
    );
  });

  it("should use provided options", async () => {
    const text = "Hello";
    const options = {
      voiceId: "custom-voice",
      modelId: "custom-model",
    };
    const mockStream = new Readable();

    const convertMock = vi.fn().mockResolvedValue(mockStream);
    (ElevenLabsClient as any).mockImplementation(() => ({
      textToSpeech: {
        convert: convertMock,
      },
    }));

    tts = new ElevenLabsTTS(apiKey);

    await tts.synthesize(text, options);

    expect(convertMock).toHaveBeenCalledWith(
      options.voiceId,
      expect.objectContaining({
        text,
        modelId: options.modelId,
      }),
    );
  });

  it("should handle synthesis errors", async () => {
    const error = new Error("API Error");
    const convertMock = vi.fn().mockRejectedValue(error);
    (ElevenLabsClient as any).mockImplementation(() => ({
      textToSpeech: {
        convert: convertMock,
      },
    }));

    tts = new ElevenLabsTTS(apiKey);

    await expect(tts.synthesize("text")).rejects.toThrow(
      "ElevenLabs synthesis failed: API Error",
    );
  });
});
