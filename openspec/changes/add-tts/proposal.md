# Change: Add Text-to-Speech Pipeline

## Why

The bot needs to speak responses aloud in voice channels. Low-latency TTS with streaming output enables natural conversation flow. Cartesia offers <100ms time-to-first-audio which is critical for conversational feel.

## What Changes

- Integrate Cartesia TTS API (primary) with ElevenLabs fallback
- Stream PCM audio chunks as they're generated
- Feed audio to AudioOutputManager for Discord playback
- Support voice selection and speech rate configuration
- Track time-to-first-audio and total latency

## Impact

- Affected specs: `tts` (new capability)
- Affected code: `src/voice/tts/`
- **Workstreams touching this spec:**
  - This proposal (foundation)
  - `add-voice-orchestration` triggers TTS from LLM responses

## Module Architecture

```
src/voice/
├── tts/
│   ├── index.ts           # TTSManager
│   ├── cartesia.ts        # Cartesia streaming client
│   ├── elevenlabs.ts      # ElevenLabs fallback
│   └── types.ts           # Config and events
```

## API Design

```typescript
interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

// Returns stream of PCM chunks for AudioOutputManager
async function synthesize(request: TTSRequest): AsyncGenerator<Buffer>
```

## Dependencies

- Cartesia SDK or direct API
- @elevenlabs/voice (fallback)
- audio-output module (for playback)

## Blocked By

- `add-audio-output` - Needs playback capability (DONE)

## Blocks

- `add-voice-orchestration` - Needs TTS for bot speech
