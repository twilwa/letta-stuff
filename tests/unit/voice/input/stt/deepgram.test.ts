import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeepgramSTT } from "../../../../../src/voice/input/stt/deepgram.js";
import { LiveTranscriptionEvents } from "@deepgram/sdk";

vi.mock("../../../../../src/config/index.js", () => ({
  loadConfig: vi.fn().mockReturnValue({
    stt: { deepgramApiKey: "test-api-key" },
  }),
}));

const { mockClient, mockConnection } = vi.hoisted(() => {
  const mockConnection = {
    on: vi.fn(),
    send: vi.fn(),
    requestClose: vi.fn(),
    removeAllListeners: vi.fn(),
  };

  const mockClient = {
    listen: {
      live: vi.fn().mockReturnValue(mockConnection),
    },
  };

  return { mockClient, mockConnection };
});

vi.mock("@deepgram/sdk", async () => {
  const actual = await vi.importActual("@deepgram/sdk");
  return {
    ...actual,
    createClient: vi.fn().mockReturnValue(mockClient),
  };
});

describe("DeepgramSTT", () => {
  let stt: DeepgramSTT;

  beforeEach(() => {
    vi.clearAllMocks();
    stt = new DeepgramSTT();
  });

  afterEach(() => {
    stt.destroy();
  });

  it("initializes with API key from config", () => {
    expect(stt).toBeDefined();
  });

  it("starts connection", async () => {
    await stt.start();
    expect(mockClient.listen.live).toHaveBeenCalled();
    expect(mockConnection.on).toHaveBeenCalledWith(
      LiveTranscriptionEvents.Open,
      expect.any(Function),
    );
  });

  it("sends audio when connected", async () => {
    await stt.start();

    const openCall = mockConnection.on.mock.calls.find(
      (call) => call[0] === LiveTranscriptionEvents.Open,
    );
    if (!openCall) throw new Error("Open listener not registered");
    openCall![1]();

    const buffer = Buffer.from("audio data");
    stt.sendAudio(buffer);
    expect(mockConnection.send).toHaveBeenCalledWith(buffer);
  });

  it("emits transcription events", async () => {
    await stt.start();

    const transcriptCall = mockConnection.on.mock.calls.find(
      (call) => call[0] === LiveTranscriptionEvents.Transcript,
    );
    if (!transcriptCall) throw new Error("Transcript listener not registered");
    const transcriptCallback = transcriptCall![1];

    const mockEvent = new Promise<any>((resolve) => {
      stt.on("transcription", resolve);
    });

    transcriptCallback({
      channel: {
        alternatives: [{ transcript: "hello world", confidence: 0.98 }],
      },
      is_final: true,
    });

    const event = await mockEvent;
    expect(event).toEqual({
      text: "hello world",
      isFinal: true,
      confidence: 0.98,
    });
  });

  it("handles errors", async () => {
    await stt.start();

    const errorCall = mockConnection.on.mock.calls.find(
      (call) => call[0] === LiveTranscriptionEvents.Error,
    );
    if (!errorCall) throw new Error("Error listener not registered");
    const errorCallback = errorCall![1];

    const mockEvent = new Promise<Error>((resolve) => {
      stt.on("error", resolve);
    });

    const error = new Error("Connection failed");
    errorCallback(error);

    const receivedError = await mockEvent;
    expect(receivedError).toBe(error);
  });
});
