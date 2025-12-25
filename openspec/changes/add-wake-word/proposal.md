# Change: Add Wake Word Detection

## Why

The bot needs to detect when users say a wake word (e.g., "Hey Bot") to know when it's being directly addressed. This enables the "chime in when called" behavior without requiring constant attention to all speech.

## What Changes

- Integrate Picovoice Porcupine for wake word detection
- Create custom wake word model via Porcupine console
- Process 16kHz mono PCM from audio-transform pipeline
- Emit wake word detection events with speaker identification
- Track detection confidence and latency metrics

## Impact

- Affected specs: `wake-word` (new capability)
- Affected code: `src/voice/wake-word/`
- **Workstreams touching this spec:**
  - This proposal (foundation)
  - `add-voice-orchestration` uses wake word events for response triggers

## Module Architecture

```
src/voice/
├── wake-word/
│   ├── index.ts           # WakeWordDetector
│   ├── porcupine.ts       # Picovoice integration
│   ├── types.ts           # Detection events and config
│   └── keywords/          # Custom wake word models
```

## Dependencies

- @picovoice/porcupine-node
- audio-transform module (16kHz mono PCM input)

## Blocked By

- `add-audio-transform` - Needs 16kHz mono PCM (DONE)

## Blocks

- `add-voice-orchestration` - Needs wake word events
