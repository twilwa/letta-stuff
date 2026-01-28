# Building a sophisticated Discord Stage AI bot in 2025

The optimal stack for your requirements is **TypeScript with discord.js**, using **Letta for memory**, **LiveKit Agents + OpenAI Realtime API for voice**, and **Picovoice Porcupine for wake word detection**. This combination provides the best balance of ecosystem maturity, Stage Channel support, and production-readiness. Go lacks sufficient Discord and agent framework support; Python is viable but TypeScript has stronger Discord and MCP ecosystems.

## Language ecosystem verdict: TypeScript wins

The user's preference for TypeScript or Go over Python is well-founded—**TypeScript is the clear winner** for this use case. discord.js is the most mature Discord library with **native Stage Channel support**, 25k+ GitHub stars, and 1.5M+ monthly npm downloads. The TypeScript MCP SDK is the most mature, and both Letta and Mem0 now have official TypeScript SDKs.

**Go is not recommended** due to significant gaps. discordgo is functional but has lower-level APIs requiring more manual work—no built-in sharding, and Stage Channel support requires direct REST API calls rather than high-level abstractions. More critically, there are no Go SDKs for Letta, Mem0, or mature agent frameworks. The only exception is Zep, which offers an official Go SDK (`github.com/getzep/zep-go/v3`), but Zep's open-source edition was deprecated in 2024 (moved to cloud-only).

**Python remains viable** if you need direct ML library access (PyTorch, transformers). Both discord.py (14.7k stars) and Pycord (2.9k stars) have excellent Stage Channel support, and the AI/agent ecosystem is deepest in Python. However, TypeScript handles async voice pipelines more elegantly and has tighter MCP integration.

## Discord framework comparison for Stage Channels

All major frameworks now support Stage Channels, but implementation quality varies significantly. Stage Channels differ from Voice Channels by having a "Stage Instance" (active event with topic), speaker suppression states, and hand-raise mechanics via `request_to_speak_timestamp`.

| Framework           | Stage Support                  | Slash Commands                    | Production Status    |
| ------------------- | ------------------------------ | --------------------------------- | -------------------- |
| **discord.js** (TS) | ✅ Native `StageChannel` class | ✅ Excellent                      | Most mature          |
| **discord.py**      | ✅ Native                      | ✅ Via `app_commands`             | Active development   |
| **Pycord**          | ✅ Native (shared codebase)    | ✅ Simpler `@bot.slash_command()` | Active               |
| **discordgo** (Go)  | ⚠️ REST API only               | ✅ Good                           | Stable but basic     |
| **disgo** (Go)      | ✅ Full coverage               | ✅ Good                           | Pre-v1, used by Dyno |

**discord.js example for Stage management:**

```typescript
// Start a stage event
await stageChannel.createStageInstance({
  topic: "AI-Hosted Weekly Discussion",
  privacyLevel: StageInstancePrivacyLevel.GuildOnly,
});

// Move user to speaker (unsuppress)
await voiceState.setSuppressed(false);

// Bot becomes speaker
await guild.members.me.voice.setSuppressed(false);
```

Required permissions: `MUTE_MEMBERS` (to unsuppress), `REQUEST_TO_SPEAK`, `MANAGE_CHANNELS` (for stage instance management).

## Memory systems: Letta leads for your use case

For long-term memory with per-user and per-context partitioning, **Letta (formerly MemGPT)** is the strongest choice. It was literally created to solve Discord chatbot memory problems—the founding team spun out of UC Berkeley AI Research specifically for this.

**Letta** (v0.6.4+, v1.0 architecture released Oct 2025):

- Official TypeScript SDK (`@letta-ai/letta-client`)
- Official Discord bot template (`letta-ai/letta-discord-bot-example`, 33 stars, actively maintained)
- Agent templates support memory variables for context partitioning: spawn `user123_casual` vs `user123_onstage` agents
- Memory blocks allow structured context segments that persist across sessions
- Self-hosted (Docker + PostgreSQL) or Letta Cloud

**Mem0** is the strongest alternative with **41,000+ GitHub stars** and AWS partnership (exclusive memory provider for AWS Agent SDK). It has excellent user_id + metadata filtering for context separation:

```typescript
await memory.add(messages, {
  userId: "user123",
  metadata: { context: "onstage" },
});
```

However, Mem0 lacks an official Discord template—you'd build the integration yourself.

**ElizaOS** offers first-class Discord support with TypeScript-native architecture, including voice communication support. Its "Rooms" and "Entities" map naturally to Discord's server/channel/user hierarchy. However, its memory system is simpler (embedded SQLite) and less sophisticated than Letta's research-backed approach. Consider ElizaOS if you need tight Web3 integration.

**Not recommended:** Motorhead (effectively abandoned), Zep open-source (deprecated, cloud-only now), LangChain memory modules (deprecated, use LangGraph instead).

## Real-time voice APIs: multi-party is the hard problem

**Critical finding:** No voice AI API natively supports true multi-party group conversations with automatic speaker identification and turn-taking. All current APIs are optimized for 1-on-1 interactions. Group conversation logic must be built as a custom layer.

**OpenAI Realtime API** (GA August 2025):

- Native speech-to-speech with automatic interruption handling
- Pricing: $32/1M input tokens, $64/1M output tokens (~$0.05-0.08/min input, $0.20-0.25/min output)
- WebSocket-based, technically integrable with Discord
- Limitation: Expects single audio stream—you'd need to mix multiple Discord speakers

**Google Gemini Live API** (GA December 2025 on Vertex AI):

- Built-in VAD with "Proactive Audio" (model decides when to respond vs stay silent)
- Native thinking capability, 24 language support
- Claims to "identify main speaker even in noisy settings"
- Generally cheaper than OpenAI

**Anthropic Claude has NO native realtime voice API**. The Claude mobile app voice feature uses ElevenLabs TTS externally. For Claude in voice scenarios, use it as the LLM layer in orchestrated pipelines (Vapi, LiveKit, etc. all support Claude).

**LiveKit Agents** is the most promising for Discord integration:

- Open-source (Apache 2.0), powers ChatGPT's Advanced Voice Mode at scale
- **Designed for rooms with multiple participants**—matches Discord's model
- Built-in semantic turn detection (135M parameter transformer, 85% reduction in unintentional interruptions)
- Python and Node.js SDKs (no Go)
- Supports OpenAI Realtime, Gemini, and traditional STT→LLM→TTS pipelines
- MCP support built-in

**Recommended architecture for group voice:**

1. LiveKit Agents as orchestration layer (handles multi-participant rooms)
2. Per-speaker audio streams from Discord (separate SSRCs)
3. Speaker diarization via AssemblyAI or Deepgram
4. OpenAI Realtime or Gemini Live as voice model backend
5. Custom turn-taking and relevance logic

## Voice orchestration: solving the "yapping" vs "interrupted" problem

The balance between "not constantly interrupted" and "not yapping too much" requires **semantic turn detection** plus **relevance-threshold speaking**.

**Turn-taking solution:** Don't rely on VAD (Voice Activity Detection) alone—it only detects silence, not completion of thought. LiveKit's End-of-Utterance model (135M parameters, 50ms on CPU) analyzes content to predict when someone has actually finished speaking. Result: 85% reduction in unintentional interruptions with only 3% false negatives.

**Relevance-threshold speaking pattern:**

```typescript
function shouldSpeak(context, transcription): boolean {
  // Always respond when directly addressed
  if (containsWakeWord(transcription) || wasDirectlyAddressed(transcription)) {
    return true;
  }

  // Score contribution value
  const relevance = scoreRelevance(
    context.topic,
    botKnowledge,
    context.recentTurns,
  );
  const contributionValue = scoreContribution(
    draftResponse,
    context.recentContent,
  );
  const floorOpen = turnDetector.isFloorOpen();

  // Only speak if high relevance AND have something valuable AND floor is available
  return relevance > 0.8 && contributionValue > 0.7 && floorOpen;
}
```

**Preventing "yapping too much":**

- Rate limiting (max responses per minute)
- Turn budgeting (track bot speech vs human speech ratio)
- Cool-down periods after speaking
- Contribution scoring before any unprompted speech

**Preventing constant interruption:**

- Semantic turn detection (LiveKit EOU, Krisp TT model, or Pipecat SmartTurn)
- Configurable silence buffer (500ms+ after VAD silence)
- Backchannel filtering (ignore "uh-huh", "right", "yeah")
- Phrase completion mode (finish current sentence before yielding)

**Barge-in handling:** LiveKit and OpenAI Realtime both handle this automatically—when interrupted, TTS stops immediately, and conversation history is truncated to only what the user actually heard.

## Wake word detection: Picovoice Porcupine for production

For "chime in when called" functionality, **Picovoice Porcupine** (v4.0.0, December 2025) is the production-ready choice:

- Custom wake words via type-in phrase (ready in ~10 seconds, no data collection)
- 11x more accurate than Snowboy, detection latency <200ms
- Node.js SDK: `@picovoice/porcupine-node`
- Runs on CPU with <4% utilization on Raspberry Pi 3

**Pricing consideration:** Free tier allows only 1 monthly active user (non-commercial). Foundation tier is $6,000/year for 100 MAU. For personal/non-commercial use, **OpenWakeWord** (Apache 2.0 code, CC BY-NC-SA models) is a solid free alternative with competitive accuracy.

**Discord integration challenge:** Discord sends audio at 48kHz stereo Opus—wake word engines need 16kHz mono PCM. Required pipeline:

```
Discord Opus → Decode → Resample 48kHz→16kHz → Stereo→Mono → Wake Word Engine
```

Use `discord-ext-voice-recv` for discord.py or `receiver.subscribe()` with @discordjs/voice for TypeScript. Discord provides per-user audio streams (separate SSRCs), so you can identify who said the wake word.

**Hybrid pattern for wake word + relevance monitoring:**

```
Audio Stream → [Wake Word Detector] → Explicit activation
     ↓
[Continuous STT + Relevance Scoring] → Context-triggered activation
     ↓
Either trigger → Bot responds
```

## MCP integration: mature and well-supported

MCP (Model Context Protocol) became an industry standard when Anthropic donated it to the Linux Foundation's Agentic AI Foundation in December 2024. OpenAI, Google, Microsoft, and AWS all joined. There are now **97M+ monthly SDK downloads** and **16,000+ MCP servers** in registries.

**LangChain integration** (most production-ready):

```typescript
import { MultiServerMCPClient } from "langchain-mcp-adapters";

const client = new MultiServerMCPClient({
  memory: { transport: "stdio", command: "npx", args: ["letta-mcp-server"] },
  tools: { transport: "http", url: "http://localhost:8000/mcp" },
});
const tools = await client.getTools();
```

**Letta has native MCP support**—it exposes agent management, memory blocks, and tools via its own MCP server (`npx -y letta-mcp-server`). This means your Discord bot can use MCP to both access Letta's memory capabilities AND expose custom tools to the agent.

**Security note:** ~2,000 MCP servers found lacking authentication in July 2025 security research. OAuth 2.0 spec was added June 2025 but implementation is inconsistent. Always implement proper authorization for production MCP servers.

## Discord Stage Channel specifics

Stage Channels are channel type 13 (`GUILD_STAGE_VOICE`). Key differences from regular voice:

| Feature             | Voice Channel | Stage Channel                |
| ------------------- | ------------- | ---------------------------- |
| All users can speak | Yes           | Only unsuppressed users      |
| Stage Instance      | N/A           | Required for active event    |
| Hand raise          | N/A           | `request_to_speak_timestamp` |
| Audience            | N/A           | Suppressed users             |

**Programmatic speaker management:**

- `POST /stage-instances` — Create stage event with topic
- `PATCH /guilds/{id}/voice-states/{user.id}` — Change user's suppression state
- Listen to `voiceStateUpdate` for hand-raise detection

**Existing projects gap:** No open-source project currently combines AI conversation + Stage Channel hosting + voice. The Letta Discord template is text-only. Discord-VC-LLM handles voice but not Stage specifically. This is a novel project area.

## Recommended architecture for GCloud deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISCORD BOT (Cloud Run)                       │
│  discord.js + @discordjs/voice                                  │
│  • WebSocket to Discord Gateway                                  │
│  • Stage Channel management                                      │
│  • Slash command handling                                        │
│  • Voice stream capture per-user                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    VOICE PIPELINE (Cloud Run)                    │
│  Per-user audio → Resample → VAD (Silero) → STT (Deepgram)      │
│  → Turn Detection (LiveKit EOU) → Relevance Check               │
│  → LLM (Claude/GPT streaming) → TTS (ElevenLabs/Cartesia)       │
│  → Discord voice output                                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    AGENT LAYER                                   │
│  ┌─────────────────┐   ┌──────────────────┐                     │
│  │ Letta (Memory)  │   │ MCP Servers      │                     │
│  │ Self-hosted or  │   │ (Custom tools,   │                     │
│  │ Letta Cloud     │   │ Scale-to-0)      │                     │
│  └─────────────────┘   └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

**Cloud Run configuration:**

- Discord bot: `min-instances=1` (always on for WebSocket)
- MCP servers: `min-instances=0` (scale to zero when idle)
- Voice pipeline: Consider GPU instances (L4) if running local inference

**Latency targets:** Target <500ms total round-trip for natural conversation feel:

- Audio capture: <20ms
- STT (Deepgram streaming): <200ms
- LLM (streaming): <300ms
- TTS (Cartesia): <100ms time-to-first-audio

## Production-readiness assessment

| Component                       | Status                   | Risk Level |
| ------------------------------- | ------------------------ | ---------- |
| discord.js + Stage Channels     | ✅ Battle-tested         | Low        |
| MCP Protocol + TypeScript SDK   | ✅ Production            | Low        |
| Letta memory                    | ⚠️ Maturing rapidly      | Medium     |
| OpenAI Realtime API             | ⚠️ GA but new            | Medium     |
| LiveKit Agents                  | ✅ Powers ChatGPT        | Low        |
| Picovoice Porcupine             | ✅ Industry standard     | Low        |
| Multi-party voice orchestration | ⚠️ Custom build required | High       |

**What's experimental:** True multi-party voice AI with automatic turn-taking remains unsolved—you'll build custom logic. Speech-to-speech models like Moshi (160ms latency) exist but aren't production-ready APIs yet.

**What's vaporware/unmaintained:**

- Motorhead (abandoned)
- Snowboy (shut down December 2020)
- Zep open-source (deprecated, cloud-only)
- Disgord (archived)
- LangChain memory modules (deprecated)

## Concrete implementation path

1. **Start:** discord.js bot with Stage Channel management + slash commands
2. **Add memory:** Integrate Letta via TypeScript SDK, configure per-user/per-context agent templates
3. **Add voice capture:** @discordjs/voice for receiving audio, per-user stream handling
4. **Add wake word:** Picovoice Porcupine with Discord audio resampling pipeline
5. **Add voice pipeline:** Deepgram STT (streaming) → Turn detection → Claude/GPT → Cartesia TTS
6. **Add orchestration:** Custom relevance-threshold logic, rate limiting, cool-down periods
7. **Add MCP tools:** LangChain MCP adapters, custom MCP servers for your specific capabilities
8. **Deploy:** Cloud Run with min-instances for bot, scale-to-zero for MCP servers

**Estimated complexity:** High. No off-the-shelf solution exists for AI-powered Stage hosting with all your requirements. Plan for 3-6 months of development for a production-quality implementation. The hardest unsolved problem is multi-party voice orchestration—expect significant experimentation with turn-taking and relevance thresholds.
