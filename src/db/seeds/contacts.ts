import { db } from '@/db';
import { contacts } from '@/db/schema';

async function main() {
    const sampleContacts = [
        {
            phoneNumber: '+5215551234567',
            name: 'Juan Pérez',
            metadata: null,
            createdAt: new Date().toISOString(),
        },
        {
            phoneNumber: '+5215559876543',
            name: 'María García',
            metadata: null,
            createdAt: new Date().toISOString(),
        },
        {
            phoneNumber: '+5215552468135',
            name: 'Carlos Rodríguez',
            metadata: null,
            createdAt: new Date().toISOString(),
        },
        {
            phoneNumber: '+5215558642097',
            name: 'Ana Martínez',
            metadata: null,
            createdAt: new Date().toISOString(),
        },
        {
            phoneNumber: '+5215553698741',
            name: 'Luis López',
            metadata: null,
            createdAt: new Date().toISOString(),
        },
        {
            phoneNumber: '+5215557412589',
            name: 'Carmen Hernández',
            metadata: null,
            createdAt: new Date().toISOString(),
        },
        {
            phoneNumber: '+5215559517536',
            name: 'José González',
            metadata: null,
            createdAt: new Date().toISOString(),
        },
        {
            phoneNumber: '+5215556283749',
            name: 'Laura Sánchez',
            metadata: null,
            createdAt: new Date().toISOString(),
        },
        {
            phoneNumber: '+5215554826951',
            name: 'Miguel Ramírez',
            metadata: null,
            createdAt: new Date().toISOString(),
        },
        {
            phoneNumber: '+5215553147826',
            name: 'Sofia Torres',
            metadata: null,
            createdAt: new Date().toISOString(),
        }
    ];

    await db.insert(contacts).values(sampleContacts);
    
    console.log('✅ Contacts seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});