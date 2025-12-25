## ADDED Requirements

### Requirement: Letta Client Connection

The system SHALL connect to a Letta server for agent memory and messaging.

#### Scenario: Successful connection

- **WHEN** the application starts with valid LETTA_BASE_URL and LETTA_API_KEY
- **THEN** the client connects to the Letta server successfully

#### Scenario: Connection health check

- **WHEN** the health check is invoked
- **THEN** the system verifies the Letta server is reachable

#### Scenario: Missing configuration fails fast

- **WHEN** LETTA_AGENT_ID is not configured
- **THEN** the system logs an error and returns a user-friendly message

### Requirement: Per-User Memory Blocks

The system SHALL maintain separate memory blocks for each Discord user to enable personalized interactions.

#### Scenario: Create user block

- **WHEN** a user sends their first message
- **THEN** a new memory block is created with label /{agent_id}/discord/users/{user_id}

#### Scenario: Retrieve existing block

- **WHEN** a returning user sends a message
- **THEN** their existing memory block is found by label

#### Scenario: Attach blocks before processing

- **WHEN** a message is received from a user
- **THEN** the sender's block is attached to the agent before message processing

#### Scenario: Attach mentioned user blocks

- **WHEN** a message mentions other users via <@user_id>
- **THEN** blocks for all mentioned users are attached to the agent

#### Scenario: Detach blocks after processing

- **WHEN** message processing completes (success or failure)
- **THEN** all temporarily attached blocks are detached from the agent

### Requirement: Conversation Context

The system SHALL include recent conversation history for context-aware responses.

#### Scenario: Regular channel context

- **WHEN** a message is received in a regular channel
- **THEN** the last N messages are fetched and formatted as context

#### Scenario: Thread context

- **WHEN** a message is received in a thread
- **THEN** the full thread history is fetched instead of channel context

#### Scenario: Context disabled

- **WHEN** LETTA_CONTEXT_MESSAGE_COUNT is set to 0
- **THEN** no conversation history is fetched

### Requirement: Message Type Detection

The system SHALL detect and label message types to provide context to the agent.

#### Scenario: Direct message detection

- **WHEN** a message is received in a DM
- **THEN** it is labeled as MessageType.DM

#### Scenario: Mention detection

- **WHEN** a message @mentions the bot
- **THEN** it is labeled as MessageType.MENTION

#### Scenario: Reply detection

- **WHEN** a message is a reply to the bot's previous message
- **THEN** it is labeled as MessageType.REPLY

#### Scenario: Generic message detection

- **WHEN** a message is in a channel without mention or reply
- **THEN** it is labeled as MessageType.GENERIC

### Requirement: Streaming Message Processing

The system SHALL process Letta agent responses via streaming for responsive feedback.

#### Scenario: Stream assistant message

- **WHEN** the agent generates an assistant_message chunk
- **THEN** the content is sent to Discord

#### Scenario: Stream reasoning (optional)

- **WHEN** the agent generates a reasoning_message chunk
- **THEN** the reasoning is logged (optionally shown to user)

#### Scenario: Stream tool calls (optional)

- **WHEN** the agent generates tool_call and tool_return chunks
- **THEN** tool activity is logged (optionally shown to user)

### Requirement: Message Splitting

The system SHALL split long messages to fit Discord's 2000 character limit.

#### Scenario: Short message passthrough

- **WHEN** a message is under 2000 characters
- **THEN** it is sent as a single message

#### Scenario: Long message splitting

- **WHEN** a message exceeds 2000 characters
- **THEN** it is split at natural boundaries (newlines, spaces)

#### Scenario: Code block preservation

- **WHEN** a message contains code blocks
- **THEN** code blocks are not split across messages
