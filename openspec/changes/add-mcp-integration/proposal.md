# Change: Add MCP Tools Integration

## Why

The bot needs to use external tools via MCP (Model Context Protocol) to extend its capabilities beyond conversation. This includes accessing Letta's MCP server for memory operations and custom tool servers for domain-specific actions.

## What Changes

- Integrate MCP client for connecting to tool servers
- Connect to Letta MCP server for memory operations
- Create adapter layer for LangChain tool compatibility
- Support both stdio and HTTP MCP transports
- Implement tool result formatting for LLM consumption

## Impact

- Affected specs: `mcp-integration` (new capability)
- Affected code: `src/tools/`
- **Workstreams touching this spec:**
  - This proposal (tool layer)
  - `add-voice-orchestration` uses tools during response generation

## Module Architecture

```
src/tools/
├── index.ts               # ToolManager
├── mcp-client.ts          # Multi-server MCP client
├── letta-tools.ts         # Letta MCP server adapter
├── langchain-adapter.ts   # LangChain tool compatibility
└── types.ts               # Tool interfaces
```

## API Design

```typescript
interface ToolManager {
  // Get all available tools across servers
  getTools(): Promise<Tool[]>;

  // Execute a tool by name
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>;

  // Connect to an MCP server
  addServer(config: MCPServerConfig): Promise<void>;
}
```

## Dependencies

- @modelcontextprotocol/sdk
- langchain-mcp-adapters (optional)
- Letta MCP server (via stdio or HTTP)

## Blocked By

- Nothing (can develop independently)

## Blocks

- `add-voice-orchestration` - Uses tools for enhanced responses
