import 'dotenv/config';

if (!process.env.DISCORD_TOKEN) {
    throw new Error('Missing DISCORD_TOKEN in environment variables');
}

if (!process.env.DATABASE_URL) {
    console.warn('Warning: DATABASE_URL is not set. Database operations will fail.');
}

export const config = {
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID,
        logChannelId: '1472557512229126319',
    },
    tiktok: {
        rapidApiKey: process.env.RAPID_API_KEY,
    },
    points: {
        viewsPerPoint: 1000,
    }
};
