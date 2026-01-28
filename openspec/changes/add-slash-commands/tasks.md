## 1. Command Infrastructure

- [x] 1.1 Create `src/commands/types.ts` with command definition types
- [x] 1.2 Create `src/commands/registry.ts` to collect and register commands with Discord
- [x] 1.3 Add interaction handler in `src/index.ts` for `interactionCreate` event

## 2. Join Command

- [x] 2.1 Create `src/commands/join.ts` with `/join` command definition
- [x] 2.2 Implement join handler: resolve channel, call `VoiceConnectionManager.joinChannel()`
- [x] 2.3 Handle Stage speaker promotion after joining
- [x] 2.4 Reply with success/error feedback to user

## 3. Leave Command

- [x] 3.1 Create `src/commands/leave.ts` with `/leave` command definition
- [x] 3.2 Implement leave handler: call `VoiceConnectionManager.leaveChannel()`
- [x] 3.3 Reply with confirmation to user

## 4. Stage Commands (Extended)

- [x] 4.1 Create `src/commands/stage-start.ts` with `/stage-start` command
- [x] 4.2 Create `src/commands/stage-stop.ts` with `/stage-stop` command
- [x] 4.3 Create `src/commands/promote.ts` with `/promote` command

## 5. Wiring

- [x] 5.1 Instantiate `VoiceConnectionManager` in `src/index.ts`
- [x] 5.2 Create deploy script for command registration
- [x] 5.3 Route `interactionCreate` to command handlers
- [x] 5.4 Register all commands in index.ts

## 6. Testing

- [x] 6.1 Write unit tests for command definitions (valid structure)
- [x] 6.2 Write unit tests for join handler logic (mocked connection manager)
- [x] 6.3 Write unit tests for leave handler logic (mocked connection manager)
- [x] 6.4 Write unit tests for stage-start command
- [x] 6.5 Write unit tests for stage-stop command
- [x] 6.6 Write unit tests for promote command
- [ ] 6.7 Manual E2E test: `/join` in Discord Stage, verify bot joins and becomes speaker
- [ ] 6.8 Manual E2E test: `/leave`, verify bot disconnects cleanly
- [ ] 6.9 Manual E2E test: `/stage-start`, `/stage-stop`, `/promote`
