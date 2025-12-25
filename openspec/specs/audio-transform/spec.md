# audio-transform Specification

## Purpose
TBD - created by archiving change add-audio-transform. Update Purpose after archive.
## Requirements
### Requirement: Opus Decoding

The system SHALL decode Opus audio packets to raw PCM format.

#### Scenario: Decode Opus packet

- **WHEN** an Opus packet is received
- **THEN** it is decoded to signed 16-bit PCM samples

#### Scenario: Handle decode error

- **WHEN** an Opus packet fails to decode
- **THEN** the error is logged and the packet is skipped

#### Scenario: Output format

- **WHEN** decoding completes
- **THEN** output is PCM s16le at 48kHz stereo

### Requirement: Stereo to Mono Conversion

The system SHALL convert stereo audio to mono.

#### Scenario: Mix stereo to mono

- **WHEN** stereo PCM is received
- **THEN** it is converted to mono by averaging left and right channels

#### Scenario: Pass-through mono

- **WHEN** mono PCM is received
- **THEN** it passes through unchanged

### Requirement: Audio Resampling

The system SHALL resample audio from 48kHz to 16kHz.

#### Scenario: Resample with FFmpeg

- **WHEN** 48kHz PCM is available and FFmpeg is installed
- **THEN** audio is resampled to 16kHz using FFmpeg

#### Scenario: Resample with Speex fallback

- **WHEN** 48kHz PCM is available and FFmpeg is not installed
- **THEN** audio is resampled to 16kHz using speex-resampler

#### Scenario: Streaming resample

- **WHEN** audio data arrives continuously
- **THEN** resampling processes data in real-time with minimal latency

### Requirement: Transform Pipeline

The system SHALL provide an end-to-end transform pipeline.

#### Scenario: Full pipeline transform

- **WHEN** Opus packets from Discord enter the pipeline
- **THEN** 16kHz mono PCM s16le is output

#### Scenario: Pipeline latency

- **WHEN** audio is processed through the pipeline
- **THEN** total added latency is under 50ms

### Requirement: Output Format Validation

The system SHALL validate output meets consumer requirements.

#### Scenario: Validate 16kHz output

- **WHEN** audio exits the pipeline
- **THEN** sample rate is exactly 16000 Hz

#### Scenario: Validate mono output

- **WHEN** audio exits the pipeline
- **THEN** channel count is exactly 1

#### Scenario: Validate PCM format

- **WHEN** audio exits the pipeline
- **THEN** format is signed 16-bit little-endian PCM

