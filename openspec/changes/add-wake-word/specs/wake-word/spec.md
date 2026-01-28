## ADDED Requirements

### Requirement: Wake Word Detection Engine

The system MUST detect custom wake words in real-time audio streams using Picovoice Porcupine.

#### Scenario: Wake word detected

- **WHEN** a user says the configured wake word
- **THEN** a detection event is emitted with the user ID
- **AND** the detection latency is less than 200ms

### Requirement: Audio Format Compatibility

The system MUST accept 16kHz mono PCM s16le audio from the transform pipeline.

#### Scenario: Processing transformed audio

- **WHEN** audio has been resampled to 16kHz mono
- **THEN** the audio is correctly buffered into 512-sample frames
- **AND** each frame is processed by Porcupine

### Requirement: Multi-Word Support

The system MUST support detection of multiple wake words simultaneously.

#### Scenario: Multiple wake words configured

- **GIVEN** wake words "Hey Bot" and "OK Bot" are configured
- **WHEN** a user says either wake word
- **THEN** the appropriate detection event is emitted
- **AND** the detected keyword index identifies which wake word was used

### Requirement: Detection Metrics

The system MUST track wake word detection metrics for monitoring.

#### Scenario: Metrics collection

- **WHEN** a wake word is detected
- **THEN** the detection count is incremented
- **AND** the detection latency is recorded
