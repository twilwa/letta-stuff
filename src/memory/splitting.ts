// ABOUTME: Message splitting utilities for Discord
// ABOUTME: Splits long messages while preserving code blocks

const DISCORD_MAX_LENGTH = 2000;
const CODE_FENCE = "```";

/**
 * Split a message into chunks that fit within Discord's 2000 char limit
 * Preserves code blocks by ensuring each chunk has balanced fences
 */
export function splitMessage(
  message: string,
  maxLength = DISCORD_MAX_LENGTH,
): string[] {
  if (message.length <= maxLength) {
    return [message];
  }

  const chunks: string[] = [];
  let remaining = message;
  let inCodeBlock = false;
  let currentLanguage = "";

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Find a safe split point
    let splitPoint = findSafeSplitPoint(remaining, maxLength, inCodeBlock);

    let chunk = remaining.substring(0, splitPoint);

    // Check code block state in this chunk
    const fenceMatches = chunk.match(/```(\w*)?/g) || [];
    for (const fence of fenceMatches) {
      if (inCodeBlock) {
        inCodeBlock = false;
        currentLanguage = "";
      } else {
        inCodeBlock = true;
        // Extract language if present
        const langMatch = fence.match(/```(\w+)/);
        currentLanguage = langMatch ? langMatch[1] : "";
      }
    }

    // If we're ending in a code block, close it and reopen in next chunk
    if (inCodeBlock) {
      chunk = chunk + "\n" + CODE_FENCE;
      // The next chunk will reopen the code block
    }

    chunks.push(chunk);
    remaining = remaining.substring(splitPoint);

    // If we closed a code block, reopen it in the remaining text
    if (inCodeBlock && remaining.length > 0) {
      remaining = CODE_FENCE + currentLanguage + "\n" + remaining.trimStart();
    }
  }

  return chunks;
}

/**
 * Find a safe point to split the message
 * Prefers newlines, then spaces, then forces split at max length
 */
function findSafeSplitPoint(
  text: string,
  maxLength: number,
  inCodeBlock: boolean,
): number {
  // Reserve space for closing fence if in code block
  const effectiveMax = inCodeBlock ? maxLength - 4 : maxLength;

  // Try to find a newline near the end
  const searchStart = Math.max(0, effectiveMax - 200);
  const searchText = text.substring(searchStart, effectiveMax);

  const lastNewline = searchText.lastIndexOf("\n");
  if (lastNewline !== -1) {
    return searchStart + lastNewline + 1; // Include the newline
  }

  // Try to find a space
  const lastSpace = searchText.lastIndexOf(" ");
  if (lastSpace !== -1) {
    return searchStart + lastSpace + 1;
  }

  // Force split at max length
  return effectiveMax;
}
