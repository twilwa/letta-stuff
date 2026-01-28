// ABOUTME: Letta client wrapper with configuration
// ABOUTME: Provides factory function and singleton for Letta API access

import { Letta } from "@letta-ai/letta-client";

export interface LettaClientConfig {
  baseUrl?: string;
  apiKey?: string;
}

export interface LettaClientWrapper {
  baseUrl: string;
  apiKey?: string;
  client: Letta;
}

const DEFAULT_BASE_URL = "http://localhost:8283";

/**
 * Create a new Letta client with the given configuration
 * Use this for testing or when you need multiple clients
 */
export function createLettaClient(
  config: LettaClientConfig,
): LettaClientWrapper {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

  const client = new Letta({
    baseURL: baseUrl,
    apiKey: config.apiKey,
  });

  return {
    baseUrl,
    apiKey: config.apiKey,
    client,
  };
}

// Singleton instance
let singletonClient: LettaClientWrapper | null = null;

/**
 * Get the singleton Letta client instance
 * Uses environment variables for configuration
 */
export function getLettaClient(): LettaClientWrapper {
  if (!singletonClient) {
    singletonClient = createLettaClient({
      baseUrl: process.env.LETTA_BASE_URL,
      apiKey: process.env.LETTA_API_KEY,
    });
  }

  return singletonClient;
}

/**
 * Reset the singleton client (for testing)
 */
export function resetLettaClient(): void {
  singletonClient = null;
}
