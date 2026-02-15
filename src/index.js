import { client } from './bot/client.js';
import { logger } from './core/logger.js';
import { initScheduler } from './jobs/scheduler.js';

async function main() {
    logger.info('Starting Utopia Bot...');
    initScheduler();
    await client.start();
}

main().catch(err => {
    console.error('Fatal error in main loop', err);
});
