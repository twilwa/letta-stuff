// ABOUTME: Main entry point for Discord Stage AI bot
// ABOUTME: Initializes client, loads config, and starts the bot

import { loadConfig } from './config';
import { createClient } from './discord/client';

console.log('🚀 Starting Discord Stage AI bot...');

// Load and validate configuration
console.log('📋 Loading configuration...');
const config = loadConfig();
console.log('✓ Configuration loaded successfully');

// Create Discord client
console.log('🔧 Creating Discord client...');
const client = createClient();

// Handle process-level errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Handle Discord client errors
client.on('error', (error) => {
  console.error('🛑 Discord client error:', error);
});

// Handle graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    if (client.isReady()) {
      await client.destroy();
      console.log('✓ Discord client disconnected');
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Discord ready event
client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user?.tag}!`);
  console.log('✓ Bot is ready');
});

// Login to Discord
console.log('🔐 Logging in to Discord...');
client.login(config.discord.token).catch((error) => {
  console.error('❌ Failed to login:', error);
  process.exit(1);
});
