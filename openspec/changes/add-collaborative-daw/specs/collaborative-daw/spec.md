## ADDED Requirements

### Requirement: Orchestrator Session Management

The system MUST support an orchestrator role that controls collaborative music sessions.

#### Scenario: Starting an orchestrator session

- **GIVEN** a user is in a voice channel
- **WHEN** they invoke `/orchestra start`
- **THEN** they become the orchestrator for that channel
- **AND** sample request mode is activated
- **AND** other users can submit samples

#### Scenario: Ending an orchestrator session

- **GIVEN** an active orchestrator session
- **WHEN** the orchestrator invokes `/orchestra stop`
- **THEN** the session ends
- **AND** any pending sample requests are cleared

### Requirement: Sample Request System

The system MUST allow orchestrators to request specific types of samples from participants.

#### Scenario: Requesting a sample category

- **GIVEN** an active orchestrator session
- **WHEN** the orchestrator invokes `/request drums --bpm 120 --key Dm`
- **THEN** a sample request is broadcast to participants
- **AND** participants can submit matching samples
- **AND** submissions are queued for review

#### Scenario: Sample submission

- **GIVEN** an active sample request
- **WHEN** a participant uploads an audio file
- **THEN** the sample is analyzed for BPM and key
- **AND** metadata is attached to the submission
- **AND** the sample is added to the request queue

### Requirement: Sample Selection and Voting

The system MUST provide mechanisms for selecting winning samples.

#### Scenario: Orchestrator selection

- **GIVEN** multiple sample submissions for a request
- **WHEN** the orchestrator reviews and selects a sample
- **THEN** the winning sample is marked for DAW integration
- **AND** the contributor is credited

#### Scenario: Community voting (optional mode)

- **GIVEN** voting mode is enabled for a request
- **WHEN** the voting period ends
- **THEN** the highest-voted sample wins
- **AND** ties are broken by orchestrator choice

### Requirement: DAW Bridge Communication

The system MUST communicate with DAWs via OSC or MIDI protocols.

#### Scenario: Connecting to Ableton Live

- **GIVEN** AbletonOSC is installed in Live
- **WHEN** the bot starts with Ableton mode enabled
- **THEN** an OSC connection is established on configured ports
- **AND** transport control is available

#### Scenario: Transport control

- **GIVEN** an active DAW connection
- **WHEN** the orchestrator invokes `/daw play` or `/daw stop`
- **THEN** the corresponding OSC message is sent
- **AND** the DAW responds accordingly

#### Scenario: Tempo synchronization

- **GIVEN** an active DAW connection
- **WHEN** the orchestrator sets tempo via `/daw tempo 120`
- **THEN** the DAW tempo is updated
- **AND** Ableton Link broadcasts to connected devices

### Requirement: Sample Library Management

The system MUST maintain per-user sample libraries with metadata.

#### Scenario: Adding a sample to library

- **GIVEN** a user uploads a sample
- **WHEN** analysis completes
- **THEN** the sample is stored with metadata (BPM, key, duration, waveform)
- **AND** it is searchable by the user

#### Scenario: Searching sample library

- **GIVEN** a user has samples in their library
- **WHEN** they invoke `/library search --bpm 120 --key minor`
- **THEN** matching samples are returned
- **AND** results include previews

### Requirement: Audio Analysis

The system MUST automatically analyze uploaded audio for musical properties.

#### Scenario: BPM detection

- **WHEN** an audio file is uploaded
- **THEN** BPM is detected within ±2 BPM accuracy
- **AND** the value is stored as metadata

#### Scenario: Key detection

- **WHEN** an audio file is uploaded
- **THEN** musical key is detected (major/minor + root)
- **AND** the value is stored as metadata

### Requirement: Mix Streaming to Discord

The system MUST stream DAW output to Discord voice channels.

#### Scenario: Live mix monitoring

- **GIVEN** an active orchestrator session with DAW connection
- **WHEN** the DAW is playing
- **THEN** the mix audio streams to the Discord voice channel
- **AND** participants hear the work in progress

#### Scenario: Barge-in handling

- **GIVEN** mix is streaming to Discord
- **WHEN** the orchestrator unmutes to speak
- **THEN** mix volume is ducked or paused
- **AND** orchestrator voice is prioritized
