# Change: Add Voice Connection Module

## Why

The bot needs to establish and maintain voice connections to Discord channels. This is the foundation that all voice features (audio input, output, processing) build upon. It manages the @discordjs/voice lifecycle independently from the audio processing pipeline.

## What Changes

- Integrate @discordjs/voice for voice connection management
- Implement voice connection lifecycle (create, ready, disconnected, destroyed)
- Handle automatic reconnection on network issues
- Provide connection state events for other modules
- Manage voice connection per guild

## Impact

- Affected specs: `voice-connection` (new capability)
- Affected code: `src/voice/connection/`
- **Workstreams touching this spec:**
  - Wave 1: This proposal (foundation)
  - Wave 1: `add-audio-output` uses connection for playback (parallel)
  - Wave 2: `add-audio-input` uses connection for receiving (depends on this)

## Module Architecture

```
src/voice/
├── connection/
│   ├── index.ts           # VoiceConnectionManager
│   ├── lifecycle.ts       # Connection state machine
│   └── types.ts           # Connection types and events
```

## Dependencies

- @discordjs/voice
- @discordjs/opus (transitive)
- sodium-native or tweetnacl (encryption)

## Blocked By

- `add-discord-core` - Needs Discord client with voice intents

## Blocks

- `add-audio-input` - Needs active voice connection
- `add-audio-output` - Needs active voice connection (but can develop in parallel with mocks)
