# Change: Add Slash Commands for Voice Control

## Why

The bot currently has no user-facing interface to join or leave Stage channels. The `VoiceConnectionManager` exists and is tested, but nothing invokes it at runtime. Users need a way to summon the bot to a Stage and dismiss it when done.

## What Changes

- Add Discord slash command registration and handling infrastructure
- Implement `/join` command to connect to a Stage/voice channel
- Implement `/leave` command to disconnect from the current channel
- Wire commands to the existing `VoiceConnectionManager`

## Impact

- Affected specs: None (new capability)
- New spec: `slash-commands`
- Affected code:
  - New: `src/commands/` directory with command definitions and handler
  - Modified: `src/index.ts` to register commands and handle interactions
  - Uses: `src/voice/connection/` (VoiceConnectionManager)
