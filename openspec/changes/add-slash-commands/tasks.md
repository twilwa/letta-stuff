## 1. Command Infrastructure

- [x] 1.1 Create `src/commands/types.ts` with command definition types
- [x] 1.2 Create `src/commands/registry.ts` to collect and register commands with Discord
- [x] 1.3 Add interaction handler in `src/index.ts` for `interactionCreate` event

## 2. Join Command

- [ ] 2.1 Create `src/commands/join.ts` with `/join` command definition
- [ ] 2.2 Implement join handler: resolve channel, call `VoiceConnectionManager.joinChannel()`
- [ ] 2.3 Handle Stage speaker promotion after joining
- [ ] 2.4 Reply with success/error feedback to user

## 3. Leave Command

- [ ] 3.1 Create `src/commands/leave.ts` with `/leave` command definition
- [ ] 3.2 Implement leave handler: call `VoiceConnectionManager.leaveChannel()`
- [ ] 3.3 Reply with confirmation to user

## 4. Wiring

- [ ] 4.1 Instantiate `VoiceConnectionManager` in `src/index.ts`
- [ ] 4.2 Register commands on bot ready (deploy to guild or global)
- [ ] 4.3 Route `interactionCreate` to command handlers

## 5. Testing

- [ ] 5.1 Write unit tests for command definitions (valid structure)
- [ ] 5.2 Write unit tests for join handler logic (mocked connection manager)
- [ ] 5.3 Write unit tests for leave handler logic (mocked connection manager)
- [ ] 5.4 Manual E2E test: `/join` in Discord Stage, verify bot joins and becomes speaker
- [ ] 5.5 Manual E2E test: `/leave`, verify bot disconnects cleanly
