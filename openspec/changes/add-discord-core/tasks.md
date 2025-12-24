## 1. Project Setup

- [ ] 1.1 Initialize npm project with TypeScript configuration
- [ ] 1.2 Install core dependencies: discord.js, @discordjs/voice, dotenv
- [ ] 1.3 Install dev dependencies: typescript, ts-node-dev, @types/\*, vitest
- [ ] 1.4 Configure tsconfig.json (ES2020, strict mode, CommonJS)
- [ ] 1.5 Set up trunk check for linting and formatting
- [ ] 1.6 Create modular directory structure (config/, discord/, commands/, text/, voice/)

## 2. Configuration

- [ ] 2.1 Create .env.template with required Discord variables
- [ ] 2.2 Implement config loader with validation (fail fast on missing keys)
- [ ] 2.3 Add config types for type-safe environment access
- [ ] 2.4 Document all environment variables in README

## 3. Discord Client

- [ ] 3.1 Create Discord client with required gateway intents
  - Guilds, GuildMessages, MessageContent, DirectMessages
  - GuildVoiceStates (for Stage/voice)
- [ ] 3.2 Implement client ready handler with logging
- [ ] 3.3 Implement error handling (unhandledRejection, client errors)
- [ ] 3.4 Add graceful shutdown handling (SIGINT, SIGTERM)

## 4. Stage Channel Management

- [ ] 4.1 Implement Stage Channel detection (channel type 13)
- [ ] 4.2 Implement Stage Instance creation (topic, privacy level)
- [ ] 4.3 Implement Stage Instance termination
- [ ] 4.4 Implement speaker state management (suppress/unsuppress)
- [ ] 4.5 Implement hand-raise detection (voiceStateUpdate event)
- [ ] 4.6 Add permission checking utilities (MUTE_MEMBERS, MANAGE_CHANNELS)

## 5. Slash Commands Framework

- [ ] 5.1 Create command registration system with deploy script
- [ ] 5.2 Implement command handler with routing
- [ ] 5.3 Implement /join command (join voice/Stage channel)
- [ ] 5.4 Implement /leave command (leave current channel)
- [ ] 5.5 Implement /stage-start command (create Stage Instance)
- [ ] 5.6 Implement /stage-stop command (end Stage Instance)
- [ ] 5.7 Implement /promote command (unsuppress user - hand-raise backup)

## 6. Testing

- [ ] 6.1 Write unit tests for config validation
- [ ] 6.2 Write unit tests for Stage channel utilities
- [ ] 6.3 Create test fixtures and mocks for Discord.js types
- [ ] 6.4 Document manual testing procedure for Discord integration
