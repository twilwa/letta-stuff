// ABOUTME: Discord client creation and configuration
// ABOUTME: Sets up client with required intents for Stage channels and voice

import { Client, GatewayIntentBits, Partials } from "discord.js";

export function createClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds, // Needed for guild/server access
      GatewayIntentBits.GuildMessages, // Needed to read messages in servers
      GatewayIntentBits.MessageContent, // Required to read message content
      GatewayIntentBits.DirectMessages, // Needed to receive DMs
      GatewayIntentBits.GuildVoiceStates, // Required for voice/Stage channels
    ],
    partials: [Partials.Channel], // Required for handling DMs
  });

  return client;
}
