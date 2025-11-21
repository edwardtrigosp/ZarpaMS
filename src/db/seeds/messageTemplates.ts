import { db } from '@/db';
import { messageTemplates } from '@/db/schema';

async function main() {
    const sampleTemplates = [
        {
            name: 'appointment_reminder',
            content: 'Hola {{name}}, te recordamos tu cita el {{date}} a las {{time}}. Confirma tu asistencia.',
            variables: JSON.stringify(['name', 'date', 'time']),
            language: 'es',
            category: 'UTILITY',
            status: 'APPROVED',
            metaTemplateId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'special_offer',
            content: '¡Oferta especial para ti {{name}}! Descuento del {{discount}}% en todos nuestros productos. Válido hasta {{expiry_date}}.',
            variables: JSON.stringify(['name', 'discount', 'expiry_date']),
            language: 'es',
            category: 'MARKETING',
            status: 'PENDING',
            metaTemplateId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'verification_code',
            content: 'Tu código de verificación es: {{code}}. Válido por 5 minutos.',
            variables: JSON.stringify(['code']),
            language: 'es',
            category: 'AUTHENTICATION',
            status: 'APPROVED',
            metaTemplateId: 'template_meta_12345',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(messageTemplates).values(sampleTemplates);
    
    console.log('✅ Message templates seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});