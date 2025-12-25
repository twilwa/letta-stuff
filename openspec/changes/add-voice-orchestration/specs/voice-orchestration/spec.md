## ADDED Requirements

### Requirement: Wake Word Response

The system MUST respond when a user says the configured wake word.

#### Scenario: Direct wake word activation

- **WHEN** a user says the wake word
- **THEN** the bot begins processing the user's speech
- **AND** generates a response

### Requirement: Relevance-Threshold Speaking

The system MUST only speak unprompted when relevance exceeds threshold.

#### Scenario: High relevance conversation

- **GIVEN** the conversation topic is relevant to bot knowledge
- **AND** the relevance score exceeds 0.8
- **AND** the floor is open (no one speaking)
- **THEN** the bot may speak without wake word
- **AND** the response adds value to the conversation

#### Scenario: Low relevance conversation

- **GIVEN** the conversation topic has low relevance
- **WHEN** the relevance score is below 0.8
- **THEN** the bot remains silent
- **AND** waits for direct address

### Requirement: Barge-In Handling

The system MUST stop speaking when interrupted by a user.

#### Scenario: User interrupts bot

- **GIVEN** the bot is speaking
- **WHEN** a user begins speaking
- **THEN** the bot stops TTS playback immediately
- **AND** acknowledges the interruption contextually

### Requirement: Turn Budgeting

The system MUST limit bot speaking to maintain natural conversation flow.

#### Scenario: Excessive bot speaking

- **GIVEN** the bot has spoken more than humans in recent turns
- **WHEN** a new response opportunity arises
- **THEN** the bot applies a higher threshold for speaking
- **AND** yields floor to human participants

### Requirement: Rate Limiting

The system MUST implement rate limits to prevent excessive responses.

#### Scenario: Rate limit exceeded

- **GIVEN** the bot has responded 5 times in the last minute
- **WHEN** a new trigger occurs
- **THEN** the response is delayed or suppressed
- **AND** the rate limit is logged for monitoring

### Requirement: LLM Response Generation

The system MUST generate responses using Claude or GPT with conversation context.

#### Scenario: Context-aware response

- **GIVEN** a user asks a question
- **AND** the conversation history is available
- **AND** user memory from Letta is attached
- **WHEN** the LLM generates a response
- **THEN** the response considers full conversation context
- **AND** the response is personalized to the user

### Requirement: Streaming Response Pipeline

The system MUST stream LLM responses to TTS for low-latency playback.

#### Scenario: End-to-end streaming

- **WHEN** the LLM begins generating a response
- **THEN** response tokens are immediately sent to TTS
- **AND** audio playback begins before response completion
