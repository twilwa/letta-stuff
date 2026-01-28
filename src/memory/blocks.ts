// ABOUTME: Memory block management for per-user Discord blocks
// ABOUTME: Handles block creation, attachment, and detachment with Letta API

import { generateUserBlockLabel } from "./labels";

export const DEFAULT_USER_BLOCK_TEMPLATE = `Discord User Memory Block
User ID: {userId}
Username: Unknown
First seen: {date}
Notes: New Discord user - no interaction history yet.
`;

export interface BlockTemplate {
  label: string;
  value: string;
  limit: number;
}

/**
 * Create a user block template ready for creation in Letta
 */
export function createUserBlockTemplate(
  agentId: string,
  userId: string,
): BlockTemplate {
  const label = generateUserBlockLabel(agentId, userId);
  const value = DEFAULT_USER_BLOCK_TEMPLATE.replace("{userId}", userId).replace(
    "{date}",
    new Date().toISOString(),
  );

  return {
    label,
    value,
    limit: 5000, // 5KB limit for user blocks
  };
}

/**
 * Attach a block to an agent, handling 409 (already attached) gracefully
 */
export async function attachBlockToAgent(
  client: any,
  agentId: string,
  blockId: string,
): Promise<boolean> {
  try {
    await client.agents.blocks.attach(agentId, { blockId });
    return true;
  } catch (error: any) {
    // 409 means already attached - treat as success
    if (error?.status === 409 || error?.statusCode === 409) {
      return true;
    }
    throw error;
  }
}

/**
 * Detach a block from an agent, handling 404 (not attached) gracefully
 */
export async function detachBlockFromAgent(
  client: any,
  agentId: string,
  blockId: string,
): Promise<boolean> {
  try {
    await client.agents.blocks.detach(agentId, blockId);
    return true;
  } catch (error: any) {
    // 404 means not attached - treat as success for detach
    if (error?.status === 404 || error?.statusCode === 404) {
      return true;
    }
    throw error;
  }
}

/**
 * Get or create a user block by label
 */
export async function getOrCreateUserBlock(
  client: any,
  agentId: string,
  userId: string,
): Promise<{ id: string; isNew: boolean }> {
  const label = generateUserBlockLabel(agentId, userId);

  // Search for existing block with this label
  try {
    const blocks = await client.blocks.list({ label });
    if (blocks && blocks.length > 0) {
      return { id: blocks[0].id, isNew: false };
    }
  } catch {
    // Block not found, will create new one
  }

  // Create new block
  const template = createUserBlockTemplate(agentId, userId);
  const newBlock = await client.blocks.create({
    label: template.label,
    value: template.value,
    limit: template.limit,
  });

  return { id: newBlock.id, isNew: true };
}
