import { db } from '@/db';
import { whatsappConfig } from '@/db/schema';

async function main() {
    const sampleConfig = [
        {
            phoneNumberId: '123456789012345',
            accessToken: 'EAABsbCS1iHgBO7ZC9K4ZAL8xQzFmNbR3wYXJ2PvHgT5mKqWnL9sUcVxD4fGhB6jN8pRtY1oZAeI3kM7vC2wXsL4nF9hK6jB8pR3tY5oM1wV7cX2nL4fG9hK6jB8pR3tY5oM1wV7cX2nL4fG9hK6jB8pR3tY5oM1wV7cX2nL4fG9hK6jB8pR3tY5oM1wV7cX',
            businessAccountId: '987654321098765',
            webhookVerifyToken: 'my_secure_verify_token_2024',
            isVerified: false,
            dailyLimit: 1000,
            peakLimit: 10000,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(whatsappConfig).values(sampleConfig);
    
    console.log('✅ WhatsApp configuration seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});