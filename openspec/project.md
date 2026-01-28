# Project Context

## Purpose

Build a sophisticated Discord Stage Channel AI bot that can:

- Host and participate in live voice conversations on Discord Stage Channels
- Maintain long-term memory across sessions using Letta
- Respond to wake words and contextually-relevant moments
- Balance speaking vs listening naturally (not "yapping" or constantly interrupted)
- Expose and consume tools via MCP (Model Context Protocol)

## Tech Stack

### Core

- **TypeScript** - Primary language (discord.js ecosystem maturity)
- **discord.js v14+** - Discord API with native Stage Channel support
- **@discordjs/voice** - Voice connection and audio stream handling
- **@letta-ai/letta-client** - Letta TypeScript SDK for memory/agents

### Voice Pipeline

- **Picovoice Porcupine** - Wake word detection (custom phrases)
- **Deepgram** - Streaming STT with low latency
- **Cartesia or ElevenLabs** - TTS with fast time-to-first-audio
- **LiveKit EOU or similar** - Semantic turn detection

### Agent/Memory

- **Letta** (self-hosted via Docker + PostgreSQL) - Stateful agent memory
- **MCP SDK** - Tool protocol for agent capabilities
- **LangChain MCP Adapters** - Multi-server MCP client

### Infrastructure (future)

- Google Cloud Run (local dev first)
- PostgreSQL (already running via Letta Docker setup)

## Project Conventions

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier via trunk check
- Explicit types, no `any` without justification
- Async/await over raw promises

### Architecture Patterns

- **Modular pipeline design** - Voice, memory, orchestration as separate concerns
- **Event-driven** - Discord events trigger processing pipelines
- **Per-user context** - Memory blocks attached/detached per interaction
- **Stream-first** - Audio and LLM responses stream where possible

### Testing Strategy

- Unit tests for utility functions and pure logic
- Integration tests for Letta API interactions (mocked)
- E2E tests for full Discord → Letta → Discord flow (test server)
- Voice pipeline tests with recorded audio fixtures

### Git Workflow

- Main branch: `main`
- Feature branches: `feat/<workstream>-<description>`
- PR-based merges with beads issue references
- Commit format: `<type>: <description>` (feat, fix, refactor, docs, test)

## Domain Context

### Discord Stage Channels

- Channel type 13 (`GUILD_STAGE_VOICE`)
- Require Stage Instance (topic, privacy level) for active events
- Users are "suppressed" (audience) or "unsuppressed" (speakers)
- Hand-raise via `request_to_speak_timestamp`
- Permissions: `MUTE_MEMBERS`, `REQUEST_TO_SPEAK`, `MANAGE_CHANNELS`

### Voice Processing Chain

```
Discord Audio (48kHz Opus) → Decode → Resample (16kHz mono) →
  → Wake Word Detection (Porcupine)
  → VAD (Silero)
  → STT (Deepgram streaming)
  → Turn Detection (semantic EOT)
  → Relevance Check
  → LLM (Claude/GPT streaming)
  → TTS (Cartesia)
  → Discord Voice Output
```

### Multi-party Voice Challenges

- No native multi-party group conversation APIs exist
- Discord provides per-user audio streams (separate SSRCs)
- Must build custom:
  - Speaker diarization (who is talking)
  - Turn-taking logic (when to respond)
  - Relevance thresholds (should bot speak unprompted)
  - Barge-in handling (stop speaking when interrupted)

### Letta Memory Model

- Agents have memory blocks (core memory segments)
- Blocks can be attached/detached dynamically per user
- Per-user and per-context (Stage vs DM) agent templates
- Memory persists across sessions

## Important Constraints

### Discord API Limits

- Audio: 48kHz stereo Opus, per-user streams via SSRC
- Message length: 2000 characters max
- Rate limits on voice state changes

### Voice Latency Budget (~500ms total)

- Audio capture: <20ms
- STT (streaming): <200ms
- LLM (streaming): <300ms first token
- TTS: <100ms time-to-first-audio

### Letta/Memory

- Self-hosted Letta at `localhost:8283`
- PostgreSQL backend (Docker, already configured)
- Block attach/detach has latency - batch where possible

## External Dependencies

### Running Services (Local)

- Letta Server: `http://localhost:8283`
- PostgreSQL: `localhost:5432` (letta/letta/letta)

### API Keys Required

- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - LLM
- `DISCORD_TOKEN`, `APP_ID`, `PUBLIC_KEY` - Discord Bot
- `DEEPGRAM_API_KEY` - STT (when added)
- `PICOVOICE_ACCESS_KEY` - Wake word (when added)
- `CARTESIA_API_KEY` or `ELEVENLABS_API_KEY` - TTS (when added)

### Reference Implementations

- `letta-discord-bot-example/` - Text-only Discord + Letta template (submodule)
- `letta/` - Full Letta source for reference (submodule)
