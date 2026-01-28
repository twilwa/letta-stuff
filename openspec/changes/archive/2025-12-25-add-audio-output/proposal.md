# Change: Add Audio Output Module

## Why

The bot needs to speak in voice channels by playing TTS audio. This module manages the audio player, handles encoding PCM to Opus for Discord, implements barge-in detection (stop speaking when interrupted), and manages an output queue for smooth playback.

## What Changes

- Create audio player using @discordjs/voice AudioPlayer
- Encode PCM to Opus for Discord output
- Implement audio queue for sequential playback
- Implement barge-in detection (stop on user speech)
- Handle playback state events (idle, playing, paused)

## Impact

- Affected specs: `audio-output` (new capability)
- Affected code: `src/voice/output/`
- **Workstreams touching this spec:**
  - Wave 1: This proposal (parallel with voice-connection)
  - Wave 2: `add-voice-processing` feeds TTS audio to this module
  - Wave 3: `add-voice-orchestration` controls when to speak

## Module Architecture

```
src/voice/
├── output/
│   ├── index.ts           # AudioOutputManager
│   ├── player.ts          # AudioPlayer wrapper
│   ├── encoder.ts         # PCM → Opus encoding
│   ├── queue.ts           # Audio segment queue
│   └── barge-in.ts        # Interrupt detection
```

## Dependencies

- @discordjs/voice AudioPlayer, AudioResource
- prism-media for Opus encoding

## Blocked By

- `add-voice-connection` - Needs VoiceConnection for playback

## Blocks

- `add-voice-processing` (Wave 2) - Needs output for TTS playback
