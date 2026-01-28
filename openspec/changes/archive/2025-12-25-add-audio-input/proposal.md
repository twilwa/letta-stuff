# Change: Add Audio Input Module

## Why

The bot needs to receive audio from Discord users to process speech. Discord provides per-user audio streams identified by SSRC (Synchronization Source). This module handles subscribing to user audio, tracking who is speaking, and buffering audio for downstream processing.

## What Changes

- Subscribe to per-user audio streams via VoiceConnection receiver
- Map SSRC to Discord user IDs for speaker identification
- Track speaking state (who is currently making sound)
- Buffer raw Opus packets per user for downstream processing
- Emit events for speaking start/stop and new audio data

## Impact

- Affected specs: `audio-input` (new capability)
- Affected code: `src/voice/input/`
- **Workstreams touching this spec:**
  - Wave 1: This proposal
  - Wave 2: `add-audio-transform` consumes raw audio from this module
  - Wave 3: `add-voice-orchestration` uses speaker tracking for turn-taking

## Module Architecture

```
src/voice/
├── input/
│   ├── index.ts           # AudioInputManager
│   ├── receiver.ts        # Audio stream subscription
│   ├── speaker-tracker.ts # SSRC→User mapping, speaking state
│   └── buffer.ts          # Per-user audio buffer
```

## Dependencies

- `add-voice-connection` - Needs active VoiceConnection

## Blocked By

- `add-voice-connection` - Needs receiver from voice connection

## Blocks

- `add-audio-transform` - Needs raw audio stream
- `add-wake-word-detection` (Wave 2) - Needs audio to detect wake words
