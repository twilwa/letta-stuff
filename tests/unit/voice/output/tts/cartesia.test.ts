// ABOUTME: Unit tests for Cartesia TTS client
// ABOUTME: Verifies synthesis, streaming, and error handling

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CartesiaTTS } from "../../../../../src/voice/output/tts/cartesia.js";
import { CartesiaClient } from "@cartesia/cartesia-js";

// Mock dependencies
vi.mock("@cartesia/cartesia-js");
vi.mock("../../../../../src/config/index.js", () => ({
  loadConfig: () => ({
    tts: {
      cartesiaApiKey: "test-key",
    },
  }),
}));

describe("CartesiaTTS", () => {
  let mockWebsocket: any;
  let mockSource: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSource = {
      read: vi.fn(),
    };

    mockWebsocket = {
      connect: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue({ source: mockSource }),
      disconnect: vi.fn(),
    };

    // Setup CartesiaClient mock
    (CartesiaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => ({
        tts: {
          websocket: vi.fn().mockReturnValue(mockWebsocket),
        },
      }),
    );
  });

  it("should initialize with API key from config", () => {
    new CartesiaTTS();
    expect(CartesiaClient).toHaveBeenCalledWith({ apiKey: "test-key" });
  });

  it("should initialize with provided API key", () => {
    new CartesiaTTS("custom-key");
    expect(CartesiaClient).toHaveBeenCalledWith({ apiKey: "custom-key" });
  });

  it("should synthesize speech and return streaming audio segment", async () => {
    const tts = new CartesiaTTS();

    // Mock source reading
    // First read returns 100 bytes (50 samples), second returns 0 (EOF)
    mockSource.read.mockResolvedValueOnce(50).mockResolvedValueOnce(0);

    const segment = await tts.synthesize("Hello world");

    expect(mockWebsocket.connect).toHaveBeenCalled();
    expect(mockWebsocket.send).toHaveBeenCalledWith(
      expect.objectContaining({
        transcript: "Hello world",
        voice: { mode: "id", id: expect.any(String) },
      }),
    );

    expect(segment.streaming).toBe(true);
    expect(segment.text).toBe("Hello world");

    // Verify stream works
    const stream = segment.data as any;
    expect(stream).toBeDefined();

    // Consume stream
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(mockSource.read).toHaveBeenCalled();
  });

  it("should disconnect websocket on stream close", async () => {
    const tts = new CartesiaTTS();
    mockSource.read.mockResolvedValue(0); // Immediate EOF

    const segment = await tts.synthesize("test");
    const stream = segment.data as any;

    // Consume stream to trigger close
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of stream) {
      /* empty */
    }

    // Wait a tick for close event
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockWebsocket.disconnect).toHaveBeenCalled();
  });

  it("should throw error if connection fails", async () => {
    const tts = new CartesiaTTS();
    mockWebsocket.connect.mockRejectedValue(new Error("Connection failed"));

    await expect(tts.synthesize("test")).rejects.toThrow(
      "Failed to connect to Cartesia TTS",
    );
  });
});
