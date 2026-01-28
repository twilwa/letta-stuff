// ABOUTME: Unit tests for VoiceOrchestrator
// ABOUTME: Tests speech-to-response pipeline and turn coordination

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import {
  VoiceOrchestrator,
  VoiceOrchestratorConfig,
} from "../../../../src/voice/orchestration/voice-orchestrator";
import type { TranscriptionEvent } from "../../../../src/voice/input/stt/types";

class MockSTTManager extends EventEmitter {
  startUser = vi.fn();
  stopUser = vi.fn();
  sendAudio = vi.fn();
  getActiveUsers = vi.fn().mockReturnValue([]);
  destroy = vi.fn();
}

class MockTTSManager extends EventEmitter {
  synthesize = vi.fn().mockResolvedValue({
    data: Buffer.from("audio"),
    streaming: false,
  });
  getMetrics = vi.fn().mockReturnValue({});
}

class MockAudioOutputManager extends EventEmitter {
  play = vi.fn();
  stop = vi.fn();
  pause = vi.fn();
  resume = vi.fn();
  destroy = vi.fn();
  onUserSpeechStart = vi.fn();
  onUserSpeechStop = vi.fn();
}

class MockLettaClient {
  agents = {
    messages: {
      create: vi.fn().mockResolvedValue({
        messages: [{ content: "Hello! I'm here to help." }],
      }),
    },
  };
}

describe("VoiceOrchestrator", () => {
  let orchestrator: VoiceOrchestrator;
  let mockSTT: MockSTTManager;
  let mockTTS: MockTTSManager;
  let mockOutput: MockAudioOutputManager;
  let mockLetta: MockLettaClient;
  const testGuildId = "guild-123";
  const testAgentId = "agent-456";

  beforeEach(() => {
    vi.useFakeTimers();
    mockSTT = new MockSTTManager();
    mockTTS = new MockTTSManager();
    mockOutput = new MockAudioOutputManager();
    mockLetta = new MockLettaClient();

    orchestrator = new VoiceOrchestrator({
      guildId: testGuildId,
      agentId: testAgentId,
      sttManager: mockSTT as any,
      ttsManager: mockTTS as any,
      audioOutputManager: mockOutput as any,
      lettaClient: mockLetta as any,
      botName: "TestBot",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    orchestrator.destroy();
  });

  describe("initialization", () => {
    it("should start in idle state", () => {
      expect(orchestrator.getState()).toBe("idle");
    });

    it("should not be processing initially", () => {
      expect(orchestrator.isProcessing()).toBe(false);
    });
  });

  describe("direct address detection", () => {
    it("should respond when bot name is mentioned", async () => {
      const transcript: TranscriptionEvent = {
        text: "Hey TestBot, what's the weather?",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(mockLetta.agents.messages.create).toHaveBeenCalled();
    });

    it("should respond to @mention style addressing", async () => {
      const transcript: TranscriptionEvent = {
        text: "@TestBot tell me a joke",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(mockLetta.agents.messages.create).toHaveBeenCalled();
    });

    it("should not respond when bot name is not mentioned", async () => {
      const transcript: TranscriptionEvent = {
        text: "What's the weather like today?",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(mockLetta.agents.messages.create).not.toHaveBeenCalled();
    });

    it("should handle case-insensitive bot name", async () => {
      const transcript: TranscriptionEvent = {
        text: "hey testbot, help me out",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(mockLetta.agents.messages.create).toHaveBeenCalled();
    });
  });

  describe("response generation", () => {
    it("should send transcript to Letta agent", async () => {
      const transcript: TranscriptionEvent = {
        text: "TestBot, what time is it?",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(mockLetta.agents.messages.create).toHaveBeenCalledWith(
        testAgentId,
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("what time is it"),
            }),
          ]),
        }),
      );
    });

    it("should synthesize response to speech", async () => {
      const transcript: TranscriptionEvent = {
        text: "TestBot, say hello",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(mockTTS.synthesize).toHaveBeenCalledWith(
        expect.stringContaining("Hello"),
        expect.any(Object),
      );
    });

    it("should play synthesized audio", async () => {
      const transcript: TranscriptionEvent = {
        text: "TestBot, greet me",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(mockOutput.play).toHaveBeenCalledWith(
        testGuildId,
        expect.objectContaining({
          data: expect.any(Buffer),
        }),
      );
    });
  });

  describe("turn management", () => {
    it("should track bot speaking state during playback", async () => {
      const transcript: TranscriptionEvent = {
        text: "TestBot, respond to me",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(orchestrator.getTurnManager().isBotSpeaking()).toBe(true);
    });

    it("should not process new transcripts while generating response", async () => {
      const transcript1: TranscriptionEvent = {
        text: "TestBot, first question",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      const transcript2: TranscriptionEvent = {
        text: "TestBot, second question",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript1);
      mockSTT.emit("finalTranscript", transcript2);

      await vi.advanceTimersByTimeAsync(100);

      expect(mockLetta.agents.messages.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("state management", () => {
    it("should transition through states: idle -> processing -> speaking -> idle", async () => {
      const states: string[] = [];
      orchestrator.on("stateChange", (state) => states.push(state));

      const transcript: TranscriptionEvent = {
        text: "TestBot, hello",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(50);
      mockOutput.emit("playbackFinished", testGuildId);

      expect(states).toContain("processing");
      expect(states).toContain("speaking");
    });
  });

  describe("error handling", () => {
    it("should handle Letta API errors gracefully", async () => {
      mockLetta.agents.messages.create.mockRejectedValueOnce(
        new Error("API Error"),
      );

      const transcript: TranscriptionEvent = {
        text: "TestBot, test error",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      const errorHandler = vi.fn();
      orchestrator.on("error", errorHandler);

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(errorHandler).toHaveBeenCalled();
      expect(orchestrator.getState()).toBe("idle");
    });

    it("should handle TTS errors gracefully", async () => {
      mockTTS.synthesize.mockRejectedValueOnce(new Error("TTS Error"));

      const transcript: TranscriptionEvent = {
        text: "TestBot, test tts error",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      const errorHandler = vi.fn();
      orchestrator.on("error", errorHandler);

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe("lifecycle", () => {
    it("should stop processing when stopped", () => {
      orchestrator.start();
      orchestrator.stop();

      expect(orchestrator.getState()).toBe("stopped");
    });

    it("should clean up on destroy", () => {
      orchestrator.start();
      orchestrator.destroy();

      expect(orchestrator.getState()).toBe("stopped");
    });

    it("should not process transcripts when stopped", async () => {
      const transcript: TranscriptionEvent = {
        text: "TestBot, hello",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.stop();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(100);

      expect(mockLetta.agents.messages.create).not.toHaveBeenCalled();
    });
  });

  describe("barge-in handling", () => {
    it("should stop playback when barge-in detected", async () => {
      const transcript: TranscriptionEvent = {
        text: "TestBot, tell me a story",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(50);

      mockOutput.emit("bargeIn", testGuildId, "user-456");

      expect(mockOutput.stop).toHaveBeenCalledWith(testGuildId);
      expect(orchestrator.getState()).toBe("idle");
    });

    it("should emit interrupted event on barge-in", async () => {
      const interruptedHandler = vi.fn();
      orchestrator.on("interrupted", interruptedHandler);

      const transcript: TranscriptionEvent = {
        text: "TestBot, hello there",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(50);

      mockOutput.emit("bargeIn", testGuildId, "user-456");

      expect(interruptedHandler).toHaveBeenCalledWith("user-456");
    });

    it("should ignore barge-in from other guilds", async () => {
      const transcript: TranscriptionEvent = {
        text: "TestBot, hello",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript);

      await vi.advanceTimersByTimeAsync(50);

      mockOutput.emit("bargeIn", "other-guild", "user-456");

      expect(mockOutput.stop).not.toHaveBeenCalled();
    });
  });

  describe("conversation history", () => {
    it("should maintain conversation history across turns", async () => {
      const transcript1: TranscriptionEvent = {
        text: "TestBot, my name is Alice",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      orchestrator.start();
      mockSTT.emit("finalTranscript", transcript1);

      await vi.advanceTimersByTimeAsync(50);
      mockOutput.emit("playbackFinished", testGuildId);

      await vi.advanceTimersByTimeAsync(2000);

      const transcript2: TranscriptionEvent = {
        text: "TestBot, what is my name?",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };

      mockSTT.emit("finalTranscript", transcript2);

      await vi.advanceTimersByTimeAsync(50);

      expect(mockLetta.agents.messages.create).toHaveBeenCalledTimes(2);
    });

    it("should clear history on reset", () => {
      orchestrator.start();
      orchestrator.resetConversation();

      expect(orchestrator.getConversationLength()).toBe(0);
    });
  });

  describe("rate limiting", () => {
    it("should respect max responses per minute", async () => {
      const rateLimitedOrchestrator = new VoiceOrchestrator({
        guildId: testGuildId,
        agentId: testAgentId,
        sttManager: mockSTT as any,
        ttsManager: mockTTS as any,
        audioOutputManager: mockOutput as any,
        lettaClient: mockLetta as any,
        botName: "TestBot",
        maxResponsesPerMinute: 2,
      });

      rateLimitedOrchestrator.start();

      for (let i = 0; i < 5; i++) {
        const transcript: TranscriptionEvent = {
          text: `TestBot, question ${i}`,
          isFinal: true,
          confidence: 0.95,
          userId: "user-123",
        };
        mockSTT.emit("finalTranscript", transcript);
        await vi.advanceTimersByTimeAsync(50);
        mockOutput.emit("playbackFinished", testGuildId);
        await vi.advanceTimersByTimeAsync(100);
      }

      expect(mockLetta.agents.messages.create).toHaveBeenCalledTimes(2);

      rateLimitedOrchestrator.destroy();
    });

    it("should reset rate limit after one minute", async () => {
      const rateLimitedOrchestrator = new VoiceOrchestrator({
        guildId: testGuildId,
        agentId: testAgentId,
        sttManager: mockSTT as any,
        ttsManager: mockTTS as any,
        audioOutputManager: mockOutput as any,
        lettaClient: mockLetta as any,
        botName: "TestBot",
        maxResponsesPerMinute: 1,
      });

      rateLimitedOrchestrator.start();

      const transcript1: TranscriptionEvent = {
        text: "TestBot, first",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };
      mockSTT.emit("finalTranscript", transcript1);
      await vi.advanceTimersByTimeAsync(50);
      mockOutput.emit("playbackFinished", testGuildId);

      vi.advanceTimersByTime(61000);

      mockLetta.agents.messages.create.mockClear();

      const transcript2: TranscriptionEvent = {
        text: "TestBot, second",
        isFinal: true,
        confidence: 0.95,
        userId: "user-123",
      };
      mockSTT.emit("finalTranscript", transcript2);
      await vi.advanceTimersByTimeAsync(50);

      expect(mockLetta.agents.messages.create).toHaveBeenCalledTimes(1);

      rateLimitedOrchestrator.destroy();
    });
  });
});
