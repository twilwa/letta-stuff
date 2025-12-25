# Wave 1 Debrief - 2024-12-24

## Completed Workstreams

### Discord Core (letta-stuff-6fl)

- **Status**: Foundation complete, archived
- **Scope**: Project setup, config, Discord client, Stage utils
- **Tests**: 13 passing
- **Files**: src/config/, src/discord/, src/index.ts
- **Remaining**: Slash commands (can be separate issue)

### Memory System (letta-stuff-4me)

- **Status**: Core complete, archived
- **Scope**: Letta client, labels, blocks, message splitting
- **Tests**: 29 passing
- **Files**: src/memory/
- **Remaining**: Orchestration layer, streaming (can be separate issue)

## Test Coverage Analysis

| Module         | Tests | Coverage | Notes                     |
| -------------- | ----- | -------- | ------------------------- |
| Config         | 7     | ~95%     | All validation paths      |
| Discord Client | 2     | ~70%     | Intents verified          |
| Stage Utils    | 4     | 100%     | Detection + perms         |
| Labels         | 4     | 100%     | Bidirectional             |
| Splitting      | 9     | ~90%     | Code blocks, boundaries   |
| Blocks         | 12    | ~95%     | attach/detach/getOrCreate |
| Letta Client   | 4     | ~90%     | Factory + singleton       |

**Total: 42 tests passing**

## Key Decisions

1. **TDD approach**: All features test-first, caught edge cases early
2. **Block idempotency**: 409/404 treated as success for attach/detach
3. **Code block preservation**: Language tags preserved across splits
4. **Singleton pattern**: Letta client for app, factory for tests

## Gaps Left for Future

1. Slash commands (/join, /leave, /stage-start, /stage-stop, /promote)
2. Per-user memory orchestration (attach before, detach in finally)
3. Conversation context formatting
4. Agent messaging with streaming

## Dependencies Unblocked

- yko (Voice Connection) now ready
- Will unblock: d9n (Audio Input), gtd (Audio Output)

## Artifacts

- openspec/changes/archive/add-discord-core/
- openspec/changes/archive/add-memory-system/
- openspec/changes/archive/2025-12-25-add-voice-connection/
- openspec/changes/archive/2025-12-25-add-audio-input/
- openspec/changes/archive/2025-12-25-add-audio-output/
- openspec/changes/archive/2025-12-25-add-audio-transform/
- 215 unit tests in tests/unit/

---

# Wave 2 Planning - 2024-12-24

## Current State

**Implemented (Wave 1 complete):**
- Discord client + Stage utilities
- Letta memory client + per-user blocks
- VoiceConnectionManager (join/leave, reconnection, Stage speaker requests)
- AudioInputManager (per-user streams, speaker tracking, buffering)
- AudioOutputManager (queue, barge-in detection, playback)
- AudioTransformPipeline (stereo→mono, 48kHz→16kHz resampling)

**Test coverage:** 215 tests, all passing. Build clean.

## Wave 2 Proposals (Validated)

| Proposal | Tasks | Focus | Can Parallelize? |
|----------|-------|-------|------------------|
| `add-wake-word` | 25 | Picovoice Porcupine | ✅ Yes |
| `add-stt` | 28 | Deepgram streaming | ✅ Yes |
| `add-tts` | 28 | Cartesia + ElevenLabs fallback | ✅ Yes |
| `add-mcp-integration` | 29 | MCP client, Letta tools | ✅ Yes |

**Wave 3 (blocked on Wave 2):**
| Proposal | Tasks | Focus | Blocked By |
|----------|-------|-------|------------|
| `add-voice-orchestration` | 39 | Relevance scoring, turn-taking, LLM | wake-word, stt, tts |

## Dependency Graph

```
                    ┌─────────────────┐
                    │ audio-transform │ ✅ DONE
                    │   (16kHz mono)  │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  add-wake-word  │ │    add-stt      │ │    add-tts      │
│   (Porcupine)   │ │   (Deepgram)    │ │   (Cartesia)    │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
                 ┌───────────────────────┐
                 │ add-voice-orchestration│
                 │  (relevance, turns)    │
                 └───────────────────────┘

┌─────────────────┐
│add-mcp-integration│  ← Independent, can run anytime
│  (Letta tools)    │
└─────────────────┘
```

## Implementation Notes

### Wake Word (add-wake-word)
- Input: 16kHz mono PCM from AudioTransformPipeline
- Porcupine needs 512-sample frames
- Custom wake word via Porcupine console (type-in phrase)
- Emit detection events with userId for orchestration

### STT (add-stt)
- Deepgram WebSocket streaming
- Input: 16kHz mono from transform pipeline
- Emit interim + final transcripts with speaker attribution
- Track latency (<200ms target)

### TTS (add-tts)
- Cartesia primary (<100ms time-to-first-audio)
- ElevenLabs fallback
- Output: PCM stream → AudioOutputManager
- Support streaming synthesis for low latency

### MCP (add-mcp-integration)
- Connect to Letta MCP server (stdio or HTTP)
- Aggregate tools from multiple servers
- Route tool calls to correct server
- Can develop independently of voice pipeline

### Voice Orchestration (add-voice-orchestration)
- shouldSpeak() logic: wake word OR (relevance > 0.8 AND floor open)
- Rate limiting (max responses/minute)
- Turn budgeting (bot vs human speech ratio)
- Barge-in: stop TTS immediately, acknowledge interruption
- LLM integration: Claude/GPT with conversation context + Letta memory

## Build Fixes Applied This Session

1. **SSRCMap iteration**: Changed from `.entries()` (doesn't exist) to `.get(userId)` and event listeners
2. **Voice adapter type**: Cast `voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator`
3. **BargeInConfig**: Changed constructor param to `Partial<BargeInConfig>`

## Environment Variables Needed for Wave 2

```bash
# Wave 2 additions (add to .env.template)
DEEPGRAM_API_KEY=           # STT
PICOVOICE_ACCESS_KEY=       # Wake word
CARTESIA_API_KEY=           # TTS (primary)
ELEVENLABS_API_KEY=         # TTS (fallback)
```

## Recommended Delegation Strategy

1. **Parallel subagents** for wake-word, stt, tts (all input from audio-transform)
2. **Sequential** mcp-integration (no voice deps, can slot in anytime)
3. **Final integration** voice-orchestration after 1-3 complete

Each subagent should:
- Use TDD per proposal tasks.md
- Work in jj bookmark `beads/<proposal-id>`
- Not touch unrelated modules
- Report back for review before merge
