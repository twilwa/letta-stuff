# audio-input Specification

## Purpose
TBD - created by archiving change add-audio-input. Update Purpose after archive.
## Requirements
### Requirement: Per-User Audio Subscription

The system SHALL receive audio streams from individual Discord users.

#### Scenario: Subscribe to user audio

- **WHEN** a user starts speaking in the voice channel
- **THEN** their audio stream is subscribed automatically

#### Scenario: Receive audio data

- **WHEN** subscribed to a user's audio
- **THEN** Opus packets are received and buffered

#### Scenario: Handle user stop speaking

- **WHEN** a subscribed user stops speaking
- **THEN** the stream ends and speaking duration is calculated

### Requirement: Speaker Tracking

The system SHALL track which users are currently speaking.

#### Scenario: Detect speaking start

- **WHEN** a user begins transmitting audio
- **THEN** a 'speakingStart' event is emitted with user ID

#### Scenario: Detect speaking stop

- **WHEN** a user stops transmitting audio
- **THEN** a 'speakingStop' event is emitted with user ID and duration

#### Scenario: Track multiple speakers

- **WHEN** multiple users speak simultaneously
- **THEN** all speaking users are tracked independently

#### Scenario: Query floor status

- **WHEN** isFloorOpen is called
- **THEN** true is returned if no one is speaking, false otherwise

### Requirement: SSRC to User Mapping

The system SHALL map audio source identifiers to Discord user IDs.

#### Scenario: Map SSRC to user

- **WHEN** audio packets arrive with an SSRC
- **THEN** the SSRC is correctly mapped to the Discord user ID

#### Scenario: Handle unknown SSRC

- **WHEN** audio arrives from unmapped SSRC
- **THEN** the system attempts to resolve the user ID

### Requirement: Audio Buffering

The system SHALL buffer audio for downstream processing.

#### Scenario: Store incoming audio

- **WHEN** Opus packets arrive from a user
- **THEN** they are stored in a per-user ring buffer

#### Scenario: Buffer overflow

- **WHEN** the buffer is full
- **THEN** the oldest data is dropped to make room

#### Scenario: Access buffered audio

- **WHEN** downstream processing requests audio
- **THEN** a sliding window of recent audio is provided

### Requirement: Cleanup on Disconnect

The system SHALL clean up resources when users or bot disconnects.

#### Scenario: User leaves channel

- **WHEN** a user leaves the voice channel
- **THEN** their audio subscription and buffer are cleaned up

#### Scenario: Bot leaves channel

- **WHEN** the bot leaves the voice channel
- **THEN** all audio subscriptions and buffers are cleaned up

