# Change: Add Discord Core Foundation

## Why

The bot needs a solid Discord.js foundation with Stage Channel support, slash commands, and proper permission handling. This is the foundational layer that both text and voice features build upon.

## What Changes

- Initialize TypeScript project with discord.js v14+ and @discordjs/voice
- Implement Discord client with proper gateway intents for voice and Stage
- Add Stage Channel management (create/join Stage Instance, speaker states)
- Implement slash command registration and handling framework
- Set up environment configuration and secrets management
- **Architecture: Clean separation between text and voice modules**

## Slash Commands

- `/join [channel]` - Join a voice/Stage channel
- `/leave` - Leave current voice channel
- `/stage-start [topic]` - Start a Stage Instance with topic
- `/stage-stop` - End the current Stage Instance
- `/promote @user` - Promote user to speaker (backup for hand-raise)

## Impact

- Affected specs: `discord-core` (new capability)
- Affected code: `src/discord/`, `src/commands/`, `src/config/`
- **Workstreams touching this spec:**
  - Wave 1: This proposal (foundation)
  - Wave 2: `add-stage-features` (extends with Stage-specific orchestration)
  - Wave 3: Integration with voice-orchestration for speaking triggers

## Architecture Notes

```
src/
├── config/           # Environment, validation
├── discord/          # Discord client, events
│   ├── client.ts     # Client setup, intents
│   ├── events/       # Event handlers
│   └── stage/        # Stage-specific utilities
├── commands/         # Slash command handlers
├── text/             # Text message processing (separate module)
└── voice/            # Voice processing (separate module)
```

Text and voice are cleanly separated modules that can be developed independently.

## Dependencies

None - this is foundational.

## Blocked By

Nothing.

## Blocks

- `add-voice-connection` - Needs Discord client and voice intents
- `add-stage-features` - Needs Stage primitives
