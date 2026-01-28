# Change: Add Speech-to-Text Pipeline

## Why

The bot needs to transcribe user speech to text for processing by the LLM. Streaming STT enables low-latency responses by processing audio in real-time rather than waiting for complete utterances.

## What Changes

- Integrate Deepgram streaming STT API
- Process 16kHz mono PCM from audio-transform pipeline
- Stream partial transcripts for early processing
- Emit final transcripts with speaker attribution
- Track transcription latency and word error rate

## Impact

- Affected specs: `stt` (new capability)
- Affected code: `src/voice/stt/`
- **Workstreams touching this spec:**
  - This proposal (foundation)
  - `add-voice-orchestration` uses transcripts for response generation

## Module Architecture

```
src/voice/
├── stt/
│   ├── index.ts           # STTManager
│   ├── deepgram.ts        # Deepgram WebSocket client
│   ├── transcript.ts      # Transcript aggregation
│   └── types.ts           # Events and config
```

## API Design

```typescript
interface TranscriptEvent {
  userId: string;
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}
```

## Dependencies

- @deepgram/sdk
- audio-transform module (16kHz mono PCM input)

## Blocked By

- `add-audio-transform` - Needs 16kHz mono PCM (DONE)

## Blocks

- `add-voice-orchestration` - Needs transcripts for LLM processing
