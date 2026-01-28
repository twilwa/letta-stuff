# tts Specification

## Purpose
TBD - created by archiving change add-tts. Update Purpose after archive.
## Requirements
### Requirement: Streaming Text-to-Speech

The system MUST synthesize speech from text using streaming TTS APIs.

#### Scenario: Low-latency speech synthesis

- **WHEN** text is sent to the TTS provider
- **THEN** audio chunks begin streaming within 100ms
- **AND** the complete audio is synthesized as a continuous stream

### Requirement: Voice Configuration

The system MUST support configurable voice selection and speech parameters.

#### Scenario: Custom voice settings

- **GIVEN** a voice ID and speech rate are configured
- **WHEN** text is synthesized
- **THEN** the audio uses the configured voice
- **AND** the speech rate matches the configured speed

### Requirement: Provider Fallback

The system MUST fall back to alternative TTS providers on failure.

#### Scenario: Primary provider unavailable

- **GIVEN** Cartesia API returns an error
- **WHEN** TTS synthesis is attempted
- **THEN** the system falls back to ElevenLabs
- **AND** synthesis completes successfully

### Requirement: Audio Format Output

The system MUST output PCM audio compatible with Discord voice.

#### Scenario: Discord-compatible output

- **WHEN** text is synthesized to audio
- **THEN** the format is PCM s16le
- **AND** the sample rate is compatible with AudioOutputManager

### Requirement: Latency Metrics

The system MUST track time-to-first-audio and total synthesis latency.

#### Scenario: Performance monitoring

- **WHEN** audio is generated
- **THEN** the time-to-first-audio is recorded
- **AND** total synthesis duration is tracked

