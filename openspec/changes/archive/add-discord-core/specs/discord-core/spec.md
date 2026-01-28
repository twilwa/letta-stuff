## ADDED Requirements

### Requirement: Discord Client Initialization

The system SHALL initialize a Discord client with gateway intents for guilds, messages, direct messages, and voice states.

#### Scenario: Successful client login

- **WHEN** the application starts with valid DISCORD_TOKEN
- **THEN** the client logs in successfully and logs the bot username

#### Scenario: Missing token fails fast

- **WHEN** the application starts without DISCORD_TOKEN
- **THEN** the application exits with error code 1 and clear error message

### Requirement: Stage Channel Detection

The system SHALL identify Discord Stage Channels (channel type 13) and distinguish them from regular voice channels.

#### Scenario: Identify Stage Channel

- **WHEN** the bot receives a voice state update for a Stage Channel
- **THEN** the system correctly identifies it as a Stage Channel

#### Scenario: Distinguish from Voice Channel

- **WHEN** the bot receives a voice state update for a regular Voice Channel
- **THEN** the system does not treat it as a Stage Channel

### Requirement: Stage Instance Management

The system SHALL create, modify, and end Stage Instances for hosting live events.

#### Scenario: Start Stage via command

- **WHEN** a user invokes /stage-start with a topic
- **THEN** a Stage Instance is created with the specified topic and GuildOnly privacy

#### Scenario: Stop Stage via command

- **WHEN** a user invokes /stage-stop
- **THEN** the active Stage Instance is ended

### Requirement: Speaker State Management

The system SHALL manage speaker suppression states for Stage participants.

#### Scenario: Bot becomes speaker

- **WHEN** the bot joins a Stage Channel
- **THEN** the bot unsuppresses itself to become a speaker

#### Scenario: Promote user via command

- **WHEN** an authorized user invokes /promote @user
- **THEN** the target user is unsuppressed and becomes a speaker

#### Scenario: Hand-raise backup

- **WHEN** the automatic hand-raise system fails
- **THEN** users can request promotion via /promote command as backup

### Requirement: Voice Channel Join/Leave

The system SHALL join and leave voice channels on command.

#### Scenario: Join via command

- **WHEN** a user invokes /join with a channel
- **THEN** the bot joins the specified voice or Stage channel

#### Scenario: Join user's channel

- **WHEN** a user invokes /join without a channel argument
- **THEN** the bot joins the user's current voice channel

#### Scenario: Leave via command

- **WHEN** a user invokes /leave
- **THEN** the bot leaves the current voice channel

### Requirement: Slash Command Framework

The system SHALL register and handle Discord slash commands for bot interaction.

#### Scenario: Command registration

- **WHEN** the bot starts or deploy script runs
- **THEN** slash commands are registered with the Discord API

#### Scenario: Command execution

- **WHEN** a user invokes a registered slash command
- **THEN** the appropriate handler is executed and a response is sent

#### Scenario: Unknown command handling

- **WHEN** a command interaction is received for an unregistered command
- **THEN** an ephemeral error message is returned to the user

### Requirement: Permission Checking

The system SHALL verify bot permissions before attempting privileged operations.

#### Scenario: Sufficient permissions

- **WHEN** the bot has MUTE_MEMBERS and MANAGE_CHANNELS permissions
- **THEN** Stage management operations succeed

#### Scenario: Insufficient permissions

- **WHEN** the bot lacks required permissions
- **THEN** operations fail gracefully with a user-friendly error message
