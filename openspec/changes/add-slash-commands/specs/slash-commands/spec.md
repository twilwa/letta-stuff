## ADDED Requirements

### Requirement: Slash Command Registration

The system SHALL register slash commands with Discord on startup.

#### Scenario: Commands registered on ready

- **WHEN** the bot connects to Discord and emits ready
- **THEN** slash commands are deployed to the configured scope (guild or global)

#### Scenario: Registration failure

- **WHEN** command registration fails
- **THEN** an error is logged but the bot continues running

### Requirement: Join Command

The system SHALL provide a `/join` slash command to connect the bot to a voice or Stage channel.

#### Scenario: Join current channel

- **WHEN** user invokes `/join` without arguments while in a voice/Stage channel
- **THEN** the bot joins the user's current voice channel

#### Scenario: Join specified channel

- **WHEN** user invokes `/join` with a channel argument
- **THEN** the bot joins the specified channel

#### Scenario: Join Stage channel

- **WHEN** the bot joins a Stage channel
- **THEN** the bot requests speaker status and becomes a speaker

#### Scenario: Already connected

- **WHEN** `/join` is invoked and the bot is already in a channel in that guild
- **THEN** the bot moves to the new channel (or stays if same channel)

#### Scenario: No channel specified and user not in voice

- **WHEN** `/join` is invoked without arguments and the user is not in a voice channel
- **THEN** an error message is returned asking the user to specify a channel or join one

#### Scenario: Invalid channel

- **WHEN** `/join` is invoked with an invalid or non-voice channel
- **THEN** an error message is returned

### Requirement: Leave Command

The system SHALL provide a `/leave` slash command to disconnect the bot from voice.

#### Scenario: Leave when connected

- **WHEN** user invokes `/leave` and the bot is in a voice channel
- **THEN** the bot disconnects and confirms departure

#### Scenario: Leave when not connected

- **WHEN** user invokes `/leave` and the bot is not in a voice channel
- **THEN** an informational message is returned indicating the bot was not connected

### Requirement: Command Permissions

The system SHALL respect Discord permissions for command execution.

#### Scenario: User lacks permissions

- **WHEN** a user without appropriate permissions invokes a command
- **THEN** Discord's built-in permission system prevents execution

#### Scenario: Bot lacks channel permissions

- **WHEN** the bot lacks Connect/Speak permissions for the target channel
- **THEN** an error message is returned explaining the missing permissions
