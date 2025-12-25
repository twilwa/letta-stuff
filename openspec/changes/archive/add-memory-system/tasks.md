## 1. Letta Client Setup

- [ ] 1.1 Install @letta-ai/letta-client
- [ ] 1.2 Create Letta client wrapper with configuration
- [ ] 1.3 Add environment variables (LETTA_BASE_URL, LETTA_API_KEY, LETTA_AGENT_ID)
- [ ] 1.4 Implement connection health check

## 2. Memory Block Management

- [ ] 2.1 Implement block search by label
- [ ] 2.2 Implement user block creation with default template
- [ ] 2.3 Implement getOrCreateUserBlock pattern
- [ ] 2.4 Implement block attach/detach to agent
- [ ] 2.5 Add error handling for 409 (already attached) and 404 (not attached)
- [ ] 2.6 Create block label naming convention (/{agent_id}/discord/users/{user_id})

## 3. Per-User Memory

- [ ] 3.1 Extract Discord user IDs from message mentions
- [ ] 3.2 Attach sender block before message processing
- [ ] 3.3 Attach mentioned user blocks
- [ ] 3.4 Detach all user blocks after processing (in finally block)
- [ ] 3.5 Add block content templates (initial user block content)

## 4. Conversation Context

- [ ] 4.1 Implement conversation history fetching (last N messages)
- [ ] 4.2 Implement thread context fetching (full thread history)
- [ ] 4.3 Format context with sender prefixes
- [ ] 4.4 Add channel/context indicators to messages
- [ ] 4.5 Implement message type detection (DM, MENTION, REPLY, GENERIC)

## 5. Agent Messaging

- [ ] 5.1 Implement sendMessage with streaming support
- [ ] 5.2 Process stream chunks (assistant_message, reasoning, tool_call, tool_return)
- [ ] 5.3 Handle typing indicators during processing
- [ ] 5.4 Implement message splitting for Discord limits (2000 chars)
- [ ] 5.5 Preserve code blocks when splitting

## 6. Agent Templates

- [ ] 6.1 Design agent template for Discord interactions
- [ ] 6.2 Create persona memory block with Discord context
- [ ] 6.3 Create human memory block template
- [ ] 6.4 Add ignore tool for declining to respond
- [ ] 6.5 Document agent configuration in README

## 7. Testing

- [ ] 7.1 Write unit tests for block label generation
- [ ] 7.2 Write unit tests for message formatting
- [ ] 7.3 Write unit tests for message splitting
- [ ] 7.4 Write integration tests for Letta API (with mocked server)
- [ ] 7.5 Create test agent for E2E testing
