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

### Wave 1 ✅ Complete (Archived)

Discord core, memory system, voice connection, audio I/O, audio transform - all implemented with 215 passing tests.

### Wave 2 (Current - Voice AI)

| Proposal              | Tasks | Focus                         | Depends On         |
| --------------------- | ----- | ----------------------------- | ------------------ |
| `add-wake-word`       | 25    | Picovoice Porcupine detection | audio-transform ✅ |
| `add-stt`             | 28    | Deepgram streaming STT        | audio-transform ✅ |
| `add-tts`             | 28    | Cartesia/ElevenLabs TTS       | audio-output ✅    |
| `add-mcp-integration` | 29    | MCP client, Letta tools       | independent        |

### Wave 3 (Integration)

| Proposal                  | Tasks | Focus                               | Depends On          |
| ------------------------- | ----- | ----------------------------------- | ------------------- |
| `add-voice-orchestration` | 39    | Relevance scoring, turn-taking, LLM | wake-word, stt, tts |

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

## Version Control (jj-first)

This repo uses jj (Jujutsu) with a colocated .git. Prefer jj over git for local work.

**Bookmark pattern for proposals:**

```bash
# Each OpenSpec proposal gets a bookmark: beads/<proposal-id>
jj bookmark create beads/add-wake-word -r @
```

**Common operations:**
| Task | jj (preferred) | git (avoid) |
|------|----------------|-------------|
| Start work | `jj new -m "msg"` | `git checkout -b` |
| Switch context | `jj edit <change>` | `git stash` |
| Undo | `jj op undo` | `git reset --hard` |
| Squash | `jj squash` | `git rebase -i` |
| Reorder | `jj rebase -r X -d Y` | `git rebase -i` |
| Update from main | `jj rebase -d main@origin` | `git rebase main` |
| View stack | `jj log -r 'beads/add-wake-word::'` | `git log` |

**When to use git:**

- Submodule operations (`git submodule update`)
- Push to remote (`jj git push` or `git push`)
- Tools that require git explicitly

**Useful revsets:**

```bash
jj log -r 'trunk()'              # main@origin
jj log -r 'bookmarks(beads/*)'   # all proposal stacks
jj diff -r '@-'                  # diff from parent
```

## Testing Notes

- Use test Discord server for E2E tests
- Record audio fixtures for voice pipeline testing
- Mock Letta API for unit tests
- Real Letta for integration tests (local server)
