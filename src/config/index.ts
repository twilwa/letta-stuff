// ABOUTME: Configuration loader for Discord Stage AI bot
// ABOUTME: Validates and loads environment variables with fail-fast behavior

import 'dotenv/config';

export interface BotConfig {
  discord: {
    token: string;
    appId: string;
    publicKey: string;
  };
  letta: {
    baseUrl: string;
    agentId?: string;
  };
}

export function loadConfig(): BotConfig {
  // Required Discord variables
  const discordToken = process.env.DISCORD_TOKEN;
  const appId = process.env.APP_ID;
  const publicKey = process.env.PUBLIC_KEY;

  // Validate required Discord variables
  if (!discordToken) {
    throw new Error('Missing required environment variable: DISCORD_TOKEN');
  }
  if (!appId) {
    throw new Error('Missing required environment variable: APP_ID');
  }
  if (!publicKey) {
    throw new Error('Missing required environment variable: PUBLIC_KEY');
  }

  // Optional Letta variables with defaults
  const lettaBaseUrl = process.env.LETTA_BASE_URL || 'http://localhost:8283';
  const lettaAgentId = process.env.LETTA_AGENT_ID;

  return {
    discord: {
      token: discordToken,
      appId: appId,
      publicKey: publicKey,
    },
    letta: {
      baseUrl: lettaBaseUrl,
      agentId: lettaAgentId,
    },
  };
}
