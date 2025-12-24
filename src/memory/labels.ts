// ABOUTME: Label generation utilities for memory blocks
// ABOUTME: Implements naming convention for per-user Discord memory blocks

const LABEL_PREFIX = "/";
const DISCORD_SEGMENT = "/discord/users/";

/**
 * Generate a block label for a Discord user
 * Format: /{agent_id}/discord/users/{user_id}
 */
export function generateUserBlockLabel(
  agentId: string,
  userId: string,
): string {
  return `${LABEL_PREFIX}${agentId}${DISCORD_SEGMENT}${userId}`;
}

/**
 * Parse a user block label to extract agent ID and user ID
 * Returns null if the label format is invalid
 */
export function parseUserBlockLabel(
  label: string,
): { agentId: string; userId: string } | null {
  if (!label || !label.startsWith(LABEL_PREFIX)) {
    return null;
  }

  // Expected format: /{agent_id}/discord/users/{user_id}
  const regex = /^\/([^/]+)\/discord\/users\/([^/]+)$/;
  const match = label.match(regex);

  if (!match) {
    return null;
  }

  return {
    agentId: match[1],
    userId: match[2],
  };
}
