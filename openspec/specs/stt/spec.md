# stt Specification

## Purpose
TBD - created by archiving change add-stt. Update Purpose after archive.
## Requirements
### Requirement: Streaming Speech Recognition

The system MUST transcribe user speech in real-time using Deepgram streaming API.

#### Scenario: Real-time transcription

- **WHEN** a user is speaking in the voice channel
- **THEN** partial transcripts are received within 200ms
- **AND** final transcripts are received when the utterance completes

### Requirement: Speaker Attribution

The system MUST attribute transcripts to the correct Discord user.

#### Scenario: Multi-user transcription

- **GIVEN** multiple users are speaking in the channel
- **WHEN** transcripts are received from Deepgram
- **THEN** each transcript includes the correct userId
- **AND** transcripts are not confused between speakers

### Requirement: Interim Results

The system MUST emit interim (partial) transcripts for early processing.

#### Scenario: Low-latency partial results

- **WHEN** a user is speaking a long sentence
- **THEN** interim transcript events are emitted immediately
- **AND** the isFinal flag is set to false

### Requirement: Connection Resilience

The system MUST automatically reconnect to Deepgram on connection loss.

#### Scenario: WebSocket reconnection

- **GIVEN** the Deepgram WebSocket connection is lost
- **WHEN** network connectivity is restored
- **THEN** the connection is automatically re-established
- **AND** transcription resumes without manual intervention

### Requirement: Transcription Metrics

The system MUST track transcription latency and quality metrics.

#### Scenario: Latency tracking

- **WHEN** transcripts are received
- **THEN** the time from audio receipt to transcript is recorded
- **AND** average latency metrics are available for monitoring

