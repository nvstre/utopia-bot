import { logger } from '../core/logger.js';

export class TikTokService {
    /**
     * Fetches video details. 
     */
    static async getVideoDetails(url) {
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            return {
                id: 'video_mock_' + Date.now(),
                username: 'test_user',
                description: 'Check my bio for code',
                views: Math.floor(Math.random() * 500) + 100,
                isValid: true
            };
        } catch (error) {
            logger.error('TikTokService Video Error', error);
            return null;
        }
    }

    /**
     * Fetches User Profile details (for bio verification).
     */
    static async getUserProfile(username) {
        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            // MOCK DATA
            // In production, scrape the profile page or use API
            return {
                username: username,
                bio: 'Hello! I am a creator. Verification Code: UTOPIA-1234 ... just kidding, I will dynamically match for testing if needed.',
                // For testing locally, we will assume the API "found" the code if it's a valid request
                // In a real mock, we might pass the code we expect to see, but here we return a generic bio 
                // and let the VerificationService "pretend" it found it or we inject it here.

                // Let's return a bio that contains "UTOPIA-" to simulate a user trying.
                // We can't know the exact code generated unless we pass it, but standard mock usually just works.
                bio: `Check out my vids! UTOPIA-VERIFY-ME`
            };
        } catch (error) {
            logger.error('TikTokService Profile Error', error);
            return null;
        }
    }
}
