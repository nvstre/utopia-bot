import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from '../config/index.js';
import { logger } from '../core/logger.js';

export class BotClient extends Client {
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildMembers
            ]
        });

        this.commands = new Collection();
    }

    async start() {
        try {
            console.log('Logging in...');

            // 1. Load commands first
            console.log('[DEBUG] Loading commands...');
            const commandLoader = await import('./loader.js');
            await commandLoader.loadCommands(this);
            console.log('[DEBUG] Commands loaded.');

            // 2. Register events
            console.log('[DEBUG] Importing interaction handler...');
            const interactionHandler = await import('./events/interactionCreate.js');
            console.log('[DEBUG] Registering interaction handler...');
            await interactionHandler.registerInteractionHandler();
            console.log('[DEBUG] Handler registered.');

            await this.login(config.discord.token);
            console.log(`Logged in as ${this.user.tag}`);
        } catch (error) {
            logger.error('Failed to start bot', error);
            process.exit(1);
        }
    }
}

export const client = new BotClient();
