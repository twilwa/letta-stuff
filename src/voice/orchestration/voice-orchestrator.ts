// ABOUTME: Coordinates voice conversation flow between STT, LLM, and TTS
// ABOUTME: Detects when to respond and manages the speech-to-response pipeline

import { EventEmitter } from "events";
import { TurnManager } from "./turn-manager";
import type { STTManager } from "../input/stt/manager";
import type { TTSManager } from "../output/tts/manager";
import type { AudioOutputManager } from "../output/manager";
import type { TranscriptionEvent } from "../input/stt/types";
import type { Letta } from "@letta-ai/letta-client";

export type OrchestratorState = "idle" | "processing" | "speaking" | "stopped";

export interface VoiceOrchestratorConfig {
  guildId: string;
  agentId: string;
  sttManager: STTManager;
  ttsManager: TTSManager;
  audioOutputManager: AudioOutputManager;
  lettaClient: Letta;
  botName: string;
  cooldownMs?: number;
  maxResponsesPerMinute?: number;
}

interface VoiceOrchestratorEvents {
  stateChange: (state: OrchestratorState) => void;
  responseGenerated: (text: string, userId: string) => void;
  interrupted: (userId: string) => void;
  error: (error: Error) => void;
}

export declare interface VoiceOrchestrator {
  on<K extends keyof VoiceOrchestratorEvents>(
    event: K,
    listener: VoiceOrchestratorEvents[K],
  ): this;
  emit<K extends keyof VoiceOrchestratorEvents>(
    event: K,
    ...args: Parameters<VoiceOrchestratorEvents[K]>
  ): boolean;
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  userId?: string;
  timestamp: number;
}

export class VoiceOrchestrator extends EventEmitter {
  private state: OrchestratorState = "idle";
  private turnManager: TurnManager;
  private readonly config: VoiceOrchestratorConfig;
  private boundHandleTranscript: (event: TranscriptionEvent) => void;
  private boundHandlePlaybackFinished: (guildId: string) => void;
  private boundHandleBargeIn: (guildId: string, userId: string) => void;
  private conversationHistory: ConversationTurn[] = [];
  private responseTimestamps: number[] = [];

  constructor(config: VoiceOrchestratorConfig) {
    super();
    this.config = config;
    this.turnManager = new TurnManager({ cooldownMs: config.cooldownMs });
    this.boundHandleTranscript = this.handleTranscript.bind(this);
    this.boundHandlePlaybackFinished = this.handlePlaybackFinished.bind(this);
    this.boundHandleBargeIn = this.handleBargeIn.bind(this);
  }

  start(): void {
    if (this.state === "stopped") {
      this.setState("idle");
    }
    this.config.sttManager.on("finalTranscript", this.boundHandleTranscript);
    this.config.audioOutputManager.on(
      "playbackFinished",
      this.boundHandlePlaybackFinished,
    );
    this.config.audioOutputManager.on("bargeIn", this.boundHandleBargeIn);
  }

  stop(): void {
    this.setState("stopped");
    this.config.sttManager.off("finalTranscript", this.boundHandleTranscript);
    this.config.audioOutputManager.off(
      "playbackFinished",
      this.boundHandlePlaybackFinished,
    );
    this.config.audioOutputManager.off("bargeIn", this.boundHandleBargeIn);
  }

  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }

  resetConversation(): void {
    this.conversationHistory = [];
  }

  getConversationLength(): number {
    return this.conversationHistory.length;
  }

  getState(): OrchestratorState {
    return this.state;
  }

  isProcessing(): boolean {
    return this.state === "processing" || this.state === "speaking";
  }

  getTurnManager(): TurnManager {
    return this.turnManager;
  }

  private setState(newState: OrchestratorState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit("stateChange", newState);
    }
  }

  private shouldRespond(text: string): boolean {
    const botNameLower = this.config.botName.toLowerCase();
    const textLower = text.toLowerCase();

    if (textLower.includes(botNameLower)) {
      return true;
    }

    if (textLower.includes(`@${botNameLower}`)) {
      return true;
    }

    return false;
  }

  private async handleTranscript(event: TranscriptionEvent): Promise<void> {
    if (this.state === "stopped" || this.isProcessing()) {
      return;
    }

    if (!this.shouldRespond(event.text)) {
      return;
    }

    if (this.isRateLimited()) {
      return;
    }

    await this.processAndRespond(event);
  }

  private isRateLimited(): boolean {
    if (!this.config.maxResponsesPerMinute) {
      return false;
    }

    const oneMinuteAgo = Date.now() - 60000;
    this.responseTimestamps = this.responseTimestamps.filter(
      (ts) => ts > oneMinuteAgo,
    );

    return this.responseTimestamps.length >= this.config.maxResponsesPerMinute;
  }

  private recordResponse(): void {
    this.responseTimestamps.push(Date.now());
  }

  private async processAndRespond(event: TranscriptionEvent): Promise<void> {
    this.setState("processing");

    try {
      const cleanedText = this.cleanTranscript(event.text);

      this.conversationHistory.push({
        role: "user",
        content: cleanedText,
        userId: event.userId,
        timestamp: Date.now(),
      });

      const response = await this.generateResponse(cleanedText, event.userId);

      if (!response) {
        this.setState("idle");
        return;
      }

      this.recordResponse();

      this.conversationHistory.push({
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      });

      this.emit("responseGenerated", response, event.userId || "unknown");

      await this.speakResponse(response);
    } catch (error) {
      this.emit("error", error as Error);
      this.setState("idle");
    }
  }

  private async generateResponse(
    text: string,
    userId?: string,
  ): Promise<string | null> {
    const result = await this.config.lettaClient.agents.messages.create(
      this.config.agentId,
      {
        messages: [
          {
            role: "user",
            content: text,
          },
        ],
      },
    );

    const assistantMessage = result.messages?.find(
      (m: any) => m.message_type === "assistant_message",
    );

    if (assistantMessage && "content" in assistantMessage) {
      return assistantMessage.content as string;
    }

    if (result.messages && result.messages.length > 0) {
      const lastMessage = result.messages[result.messages.length - 1];
      if ("content" in lastMessage) {
        return lastMessage.content as string;
      }
    }

    return null;
  }

  private cleanTranscript(text: string): string {
    const botNameRegex = new RegExp(
      `@?${this.config.botName}[,:]?\\s*`,
      "gi",
    );
    return text.replace(botNameRegex, "").trim();
  }

  private async speakResponse(text: string): Promise<void> {
    this.setState("speaking");
    this.turnManager.botStartedSpeaking();

    try {
      const audioSegment = await this.config.ttsManager.synthesize(text, {});

      this.config.audioOutputManager.play(this.config.guildId, audioSegment);
    } catch (error) {
      this.turnManager.botStoppedSpeaking();
      this.setState("idle");
      throw error;
    }
  }

  private handlePlaybackFinished(guildId: string): void {
    if (guildId !== this.config.guildId) {
      return;
    }

    this.turnManager.botStoppedSpeaking();
    this.setState("idle");
  }

  private handleBargeIn(guildId: string, userId: string): void {
    if (guildId !== this.config.guildId) {
      return;
    }

    if (this.state === "speaking") {
      this.config.audioOutputManager.stop(this.config.guildId);
      this.turnManager.botStoppedSpeaking();
      this.setState("idle");
      this.emit("interrupted", userId);
    }
  }
}
