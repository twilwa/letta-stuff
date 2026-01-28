# audio-output Specification

## Purpose
TBD - created by archiving change add-audio-output. Update Purpose after archive.
## Requirements
### Requirement: Audio Playback

The system SHALL play audio through the Discord voice connection.

#### Scenario: Play audio buffer

- **WHEN** play is called with PCM audio data
- **THEN** the audio is encoded and played through the voice connection

#### Scenario: Play audio stream

- **WHEN** play is called with a readable audio stream
- **THEN** the audio streams to the voice connection in real-time

#### Scenario: Stop playback

- **WHEN** stop is called during playback
- **THEN** audio stops immediately

### Requirement: Audio Queue

The system SHALL queue audio segments for sequential playback.

#### Scenario: Enqueue audio

- **WHEN** audio is enqueued while playing
- **THEN** it is added to the queue and plays after current segment

#### Scenario: Auto-advance

- **WHEN** an audio segment finishes playing
- **THEN** the next queued segment starts automatically

#### Scenario: Clear queue

- **WHEN** clear is called
- **THEN** all queued audio is removed (current segment may continue or stop)

#### Scenario: Queue empty event

- **WHEN** the last segment finishes and queue is empty
- **THEN** a 'queueEmpty' event is emitted

### Requirement: Barge-In Detection

The system SHALL detect when users interrupt the bot and stop speaking.

#### Scenario: Detect user speech during playback

- **WHEN** a user starts speaking while bot is playing audio
- **THEN** a barge-in is detected

#### Scenario: Stop on barge-in

- **WHEN** barge-in is detected
- **THEN** bot audio stops immediately

#### Scenario: Barge-in event

- **WHEN** barge-in occurs
- **THEN** an 'interrupted' event is emitted with the interrupting user ID

### Requirement: Playback State Management

The system SHALL track and report playback state.

#### Scenario: Report idle state

- **WHEN** no audio is playing
- **THEN** state is reported as Idle

#### Scenario: Report playing state

- **WHEN** audio is actively playing
- **THEN** state is reported as Playing

#### Scenario: State change events

- **WHEN** playback state changes
- **THEN** a state change event is emitted

### Requirement: TTS Integration

The system SHALL accept TTS audio from voice processing.

#### Scenario: Play TTS audio

- **WHEN** TTS audio is received from voice processing
- **THEN** it is played through the voice connection

#### Scenario: Stream TTS

- **WHEN** TTS is streamed chunk-by-chunk
- **THEN** playback starts before full audio is received (low latency)

