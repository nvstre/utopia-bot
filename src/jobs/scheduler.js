import cron from 'node-cron';
import crypto from 'crypto';
import { db } from '../core/database.js';
import { TikTokService } from '../services/tiktok.js';
import { logger } from '../core/logger.js';
import { config } from '../config/index.js';

export function initScheduler() {
    logger.info('Initializing Background Jobs...');

    // ---------------------------------------------------------
    // Job 1: Verify PENDING Submissions & Update Views
    // Runs every 1 minute
    // ---------------------------------------------------------
    cron.schedule('*/1 * * * *', async () => {
        logger.info('🔄 Running Job: Verification & View Tracking');

        // 1. Get all submissions (PENDING or APPROVED)
        const submissions = db.prepare(`
      SELECT * FROM Submission 
      WHERE status IN ('PENDING', 'APPROVED')
    `).all();

        for (const sub of submissions) {
            try {
                const videoData = await TikTokService.getVideoDetails(sub.tikTokUrl);

                if (!videoData) {
                    logger.warn(`Could not fetch data for submission ${sub.id}`);
                    continue;
                }

                // --- VERIFICATION LOGIC ---
                if (sub.status === 'PENDING') {
                    // In a real app, we check if (videoData.description.includes(sub.verificationCode))
                    // For DEMO: We just Auto-Approve to let the user see the system work.

                    logger.info(`✅ Auto-Verifying submission ${sub.id} for demo.`);

                    db.prepare(`UPDATE Submission SET status = 'APPROVED', updatedAt = datetime('now') WHERE id = ?`)
                        .run(sub.id);

                    // Notify user? (Ideally via DM)
                }

                // --- REWARD LOGIC ---
                // Calculate Delta
                const currentViews = videoData.views;
                const lastViews = sub.lastViewCount;
                const delta = currentViews - lastViews;

                if (delta > 0) {
                    // 1000 views = 1 point
                    const pointsEarned = (delta / 1000);

                    // Transaction: Update Submission & User Balance
                    const updateFn = db.transaction(() => {
                        // Update Submission
                        db.prepare(`
              UPDATE Submission 
              SET lastViewCount = ?, totalPointsEarned = totalPointsEarned + ?, updatedAt = datetime('now')
              WHERE id = ?
            `).run(currentViews, pointsEarned, sub.id);

                        // Update User Balance
                        db.prepare(`
              UPDATE User 
              SET balance = balance + ?, updatedAt = datetime('now')
              WHERE id = ?
            `).run(pointsEarned, sub.userId);

                        // Log View History
                        db.prepare(`
              INSERT INTO ViewLog (id, submissionId, viewCount)
              VALUES (?, ?, ?)
            `).run(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(), sub.id, currentViews);
                    });

                    updateFn();
                    logger.info(`💰 Awarded ${pointsEarned.toFixed(2)} points to User ${sub.userId} for ${delta} new views.`);
                }

            } catch (err) {
                logger.error(`Job Error for submission ${sub.id}`, err);
            }
        }
    });
}
