// ABOUTME: Script to register slash commands with Discord API
// ABOUTME: Run with: npm run deploy:commands

import { REST, Routes } from "discord.js";
import { loadConfig } from "../config";
import { CommandRegistry } from "./registry";
import { JoinCommand } from "./join";
import { LeaveCommand } from "./leave";
import { StageStartCommand } from "./stage-start";
import { StageStopCommand } from "./stage-stop";
import { PromoteCommand } from "./promote";
import { VoiceConnectionManager } from "../voice/connection";

async function deployCommands() {
  console.log("🚀 Deploying slash commands to Discord...");

  const config = loadConfig();
  const voiceManager = new VoiceConnectionManager();

  const registry = new CommandRegistry();
  registry.register(new JoinCommand(voiceManager));
  registry.register(new LeaveCommand(voiceManager));
  registry.register(new StageStartCommand());
  registry.register(new StageStopCommand());
  registry.register(new PromoteCommand());

  const commandData = registry.getCommandData();
  console.log(`📋 Registering ${commandData.length} commands...`);

  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  try {
    const guildId = process.env.GUILD_ID;

    if (guildId) {
      console.log(`🏠 Deploying to guild: ${guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(config.discord.appId, guildId),
        { body: commandData },
      );
    } else {
      console.log("🌐 Deploying globally (may take up to 1 hour to propagate)");
      await rest.put(Routes.applicationCommands(config.discord.appId), {
        body: commandData,
      });
    }

    console.log("✅ Successfully deployed commands:");
    for (const cmd of commandData) {
      console.log(`   /${cmd.name}`);
    }
  } catch (error) {
    console.error("❌ Failed to deploy commands:", error);
    process.exit(1);
  }
}

deployCommands();
