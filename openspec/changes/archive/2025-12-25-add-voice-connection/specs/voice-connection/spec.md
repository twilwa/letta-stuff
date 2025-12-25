## ADDED Requirements

### Requirement: Voice Connection Creation

The system SHALL establish voice connections to Discord voice and Stage channels.

#### Scenario: Join voice channel

- **WHEN** joinChannel is called with a voice channel
- **THEN** a voice connection is established and Ready status is reached

#### Scenario: Join Stage channel

- **WHEN** joinChannel is called with a Stage channel
- **THEN** a voice connection is established and the bot becomes a speaker

#### Scenario: Already connected

- **WHEN** joinChannel is called for a guild with existing connection
- **THEN** the existing connection is returned without creating a new one

### Requirement: Voice Connection Termination

The system SHALL cleanly terminate voice connections when leaving channels.

#### Scenario: Leave channel

- **WHEN** leaveChannel is called for a guild
- **THEN** the voice connection is destroyed and removed from tracking

#### Scenario: Leave when not connected

- **WHEN** leaveChannel is called for a guild without active connection
- **THEN** the operation completes without error

### Requirement: Connection Lifecycle Management

The system SHALL handle voice connection state transitions and recovery.

#### Scenario: Connection ready

- **WHEN** the voice connection reaches Ready status
- **THEN** a 'ready' event is emitted with the guild ID

#### Scenario: Connection disconnected

- **WHEN** the voice connection is unexpectedly disconnected
- **THEN** automatic reconnection is attempted with exponential backoff

#### Scenario: Reconnection success

- **WHEN** reconnection succeeds after disconnect
- **THEN** normal operation resumes and 'reconnected' event is emitted

#### Scenario: Reconnection failure

- **WHEN** reconnection fails after maximum attempts
- **THEN** the connection is destroyed and 'failed' event is emitted

### Requirement: Connection State Access

The system SHALL provide access to current connection state for other modules.

#### Scenario: Get active connection

- **WHEN** getConnection is called with a guild ID
- **THEN** the active VoiceConnection is returned, or undefined if none

#### Scenario: Check connection status

- **WHEN** isConnected is called with a guild ID
- **THEN** true is returned if Ready connection exists, false otherwise
