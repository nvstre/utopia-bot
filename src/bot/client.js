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
                GatewayIntentBits.DirectMessages
            ]
        });

        this.commands = new Collection();
    }

    async start() {
        try {
            console.log('Logging in...');
            await import('./loader.js').then(m => m.loadCommands());
            await import('./events/interactionCreate.js').then(m => m.registerInteractionHandler());
            await this.login(config.discord.token);
            console.log(`Logged in as ${this.user.tag}`);
        } catch (error) {
            logger.error('Failed to start bot', error);
            process.exit(1);
        }
    }
}

export const client = new BotClient();
