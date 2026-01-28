# Change: Add Letta Memory System Integration

## Why

The bot needs persistent, context-aware memory to maintain coherent conversations across sessions and provide personalized interactions per user. Letta provides the agent framework with memory blocks that can be dynamically attached/detached per conversation context.

## What Changes

- Integrate @letta-ai/letta-client TypeScript SDK
- Implement per-user memory block management (create/attach/detach)
- Implement per-context agent templates (Stage vs DM vs channel)
- Add message formatting with sender context and conversation history
- Create agent configuration and template management

## Impact

- Affected specs: `memory-system` (new capability)
- Affected code: `src/memory/`, `src/agents/`
- **Workstreams touching this spec:**
  - Wave 1: This proposal (foundation)
  - Wave 3: `add-mcp-integration` (extends with MCP tool exposure)
  - Voice pipeline will use memory for context in relevance scoring

## Dependencies

- Local Letta server running at http://localhost:8283
- PostgreSQL database (already configured)

## Blocked By

Nothing - parallel with discord-core and voice-capture.

## Blocks

- `add-mcp-integration` - Needs Letta client and agent setup
