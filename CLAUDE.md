<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Discord Stage AI Bot

## Project Overview

Building a Discord Stage Channel AI bot with:

- Voice conversation capabilities (listen + speak)
- Long-term memory via Letta
- Wake word detection (Picovoice Porcupine)
- Semantic turn-taking and relevance-threshold speaking
- MCP tool integration

See `openspec/project.md` for full architecture details.

## Local Services

```bash
# Letta Server (already running via Docker + Desktop)
# URL: http://localhost:8283
# PostgreSQL: localhost:5432 (letta/letta/letta)

# Start Letta if needed:
cd letta && docker compose up letta_db -d
LETTA_PG_DB=letta LETTA_PG_USER=letta LETTA_PG_PASSWORD=letta \
LETTA_PG_HOST=localhost LETTA_PG_PORT=5432 uv run letta server
```

## Development Commands

```bash
# Install dependencies
npm install

# Development (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Production
npm start

# Tests
npm test

# Linting
trunk check --fix
trunk fmt
```

## Environment Variables

Copy from `.env.template`. Required:

- `DISCORD_TOKEN`, `APP_ID`, `PUBLIC_KEY` - Discord Bot
- `LETTA_AGENT_ID` - Your Letta agent
- `LETTA_BASE_URL` - Default `http://localhost:8283`

Future (as features are added):

- `DEEPGRAM_API_KEY` - STT
- `PICOVOICE_ACCESS_KEY` - Wake word
- `CARTESIA_API_KEY` or `ELEVENLABS_API_KEY` - TTS

## Reference Code

- `letta-discord-bot-example/` - Text-only template (submodule)
- `letta/` - Full Letta source (submodule)

## Workstreams

Development is organized into parallelizable workstreams. See beads for current status:

```bash
bd ready           # Work ready to start
bd list            # All open issues
bd stats           # Project health
```

### Wave 1 (Foundation - Parallelizable)

| Proposal               | Tasks | Focus                                 | Parallel?            |
| ---------------------- | ----- | ------------------------------------- | -------------------- |
| `add-discord-core`     | 31    | Discord client, Stage, slash commands | ✅                   |
| `add-memory-system`    | 35    | Letta SDK, per-user memory blocks     | ✅                   |
| `add-voice-connection` | 25    | @discordjs/voice lifecycle            | ✅                   |
| `add-audio-output`     | 34    | Player, queue, barge-in               | ✅ (with connection) |

### Wave 1b (Voice Modules - After Connection)

| Proposal              | Tasks | Focus                              | Depends On                |
| --------------------- | ----- | ---------------------------------- | ------------------------- |
| `add-audio-input`     | 31    | Per-user streams, speaker tracking | voice-connection          |
| `add-audio-transform` | 37    | Opus→PCM, 48kHz→16kHz resample     | audio-input (or fixtures) |

### Wave 2 (Depends on Wave 1)

- **Wake Word Detection** - Porcupine integration (needs audio-transform)
- **Voice Processing** - STT → Turn Detection → TTS (needs audio-transform)
- **Stage Features** - Stage Instance management (needs discord-core)

### Wave 3 (Integration)

- **Voice Orchestration** - Relevance thresholds, turn-taking
- **MCP Integration** - Tool servers, LangChain adapters

## Key Patterns

### Per-User Memory Blocks

```typescript
// Attach user blocks before processing
const blockIds = await attachUserBlocks(senderId, messageContent);
try {
  // Process message with agent
} finally {
  await detachUserBlocks(blockIds);
}
```

### Audio Resampling (for voice features)

```
Discord (48kHz stereo Opus) → Decode → Resample (16kHz mono) → Wake Word/STT
```

### Relevance-Threshold Speaking

```typescript
function shouldSpeak(context, transcription): boolean {
  if (containsWakeWord(transcription)) return true;
  if (wasDirectlyAddressed(transcription)) return true;

  const relevance = scoreRelevance(context.topic, botKnowledge);
  const floorOpen = turnDetector.isFloorOpen();

  return relevance > 0.8 && floorOpen;
}
```

## Testing Notes

- Use test Discord server for E2E tests
- Record audio fixtures for voice pipeline testing
- Mock Letta API for unit tests
- Real Letta for integration tests (local server)
