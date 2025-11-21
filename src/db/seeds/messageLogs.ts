import { db } from '@/db';
import { messageLogs } from '@/db/schema';

async function main() {
    const baseDate = new Date('2024-01-15');
    
    const generatePhoneNumber = () => {
        const areaCode = ['55', '33', '81', '222', '656'][Math.floor(Math.random() * 5)];
        const number = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        return `+52${areaCode}${number}`;
    };

    const generateWamid = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'wamid.';
        for (let i = 0; i < 48; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const addMinutes = (date: Date, minutes: number) => {
        const result = new Date(date);
        result.setMinutes(result.getMinutes() + minutes);
        return result;
    };

    const messageContents = [
        'Hola María, te recordamos tu cita médica el día 20 de enero a las 10:00 AM en Consultorio 3. Por favor confirma tu asistencia.',
        'Estimado Juan, este es un recordatorio de su cita el 22 de enero a las 3:30 PM con el Dr. García. Ubicación: Clínica Central.',
        '¡Oferta especial! Obtén 20% de descuento en tu próxima compra usando el código SAVE20. Válido hasta el 31 de enero.',
        'Tu código de verificación es: 847293. No compartas este código con nadie. Válido por 10 minutos.',
        'Hola Carlos, tu cita con el dentista está programada para el 25 de enero a las 9:00 AM. Recuerda llegar 15 minutos antes.',
        '¡Promoción de fin de semana! Hasta 30% de descuento en productos seleccionados. Visita nuestra tienda o compra en línea.',
        'Tu código de seguridad es: 562019. Este código expirará en 15 minutos. Si no solicitaste este código, ignora este mensaje.',
        'Recordatorio: Tienes una cita programada el 18 de enero a las 2:00 PM. Por favor confirma o cancela con 24 horas de anticipación.',
        '¡Nueva colección disponible! Descubre las últimas tendencias con 25% de descuento. Código: NUEVA25. Oferta válida por tiempo limitado.',
        'Tu código de verificación OTP es: 391847. No lo compartas con nadie. Válido por los próximos 10 minutos.',
        'Buenos días Ana, te confirmamos tu cita médica el día 23 de enero a las 11:30 AM. Consultorio 5, segundo piso.',
        'Oferta exclusiva para ti: Compra 2 y lleva el 3er producto gratis. Válido en toda la tienda hasta el 28 de enero.',
        'Código de verificación: 728491. Usa este código para completar tu registro. El código es válido por 15 minutos.',
        'Hola Pedro, recordatorio de tu cita el 19 de enero a las 4:00 PM con el especialista. Lleva tus estudios previos.',
        '¡Último día de ofertas! Aprovecha descuentos de hasta 40% en categorías seleccionadas. No te lo pierdas.',
        'Tu código de autenticación es: 653128. Este código es personal e intransferible. Expira en 10 minutos.',
        'Estimada Lucía, confirmación de cita para el 26 de enero a las 8:30 AM. Departamento de Oftalmología, planta baja.',
        'Promoción flash: 35% de descuento en toda la tienda por las próximas 24 horas. Usa el código FLASH35 al pagar.',
        'Código de verificación de seguridad: 419736. No compartas este código. Válido por 15 minutos desde su generación.',
        'Hola Roberto, te recordamos tu cita el día 21 de enero a las 1:00 PM. Si necesitas reagendar, llama al 555-1234.'
    ];

    const errorMessages = [
        'Number not registered on WhatsApp',
        'Message sending timeout',
        'Invalid phone number'
    ];

    const sampleMessageLogs = [
        // SENT status (5 messages)
        {
            templateId: 1,
            contactId: 3,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[0],
            status: 'SENT',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -5).toISOString(),
            deliveredAt: null,
            createdAt: addDays(baseDate, -5).toISOString(),
        },
        {
            templateId: 2,
            contactId: 7,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[1],
            status: 'SENT',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -4).toISOString(),
            deliveredAt: null,
            createdAt: addDays(baseDate, -4).toISOString(),
        },
        {
            templateId: 3,
            contactId: 2,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[2],
            status: 'SENT',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -3).toISOString(),
            deliveredAt: null,
            createdAt: addDays(baseDate, -3).toISOString(),
        },
        {
            templateId: 1,
            contactId: 9,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[3],
            status: 'SENT',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -2).toISOString(),
            deliveredAt: null,
            createdAt: addDays(baseDate, -2).toISOString(),
        },
        {
            templateId: 2,
            contactId: 5,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[4],
            status: 'SENT',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -1).toISOString(),
            deliveredAt: null,
            createdAt: addDays(baseDate, -1).toISOString(),
        },
        // DELIVERED status (5 messages)
        {
            templateId: 3,
            contactId: 1,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[5],
            status: 'DELIVERED',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -6).toISOString(),
            deliveredAt: addMinutes(addDays(baseDate, -6), 5).toISOString(),
            createdAt: addDays(baseDate, -6).toISOString(),
        },
        {
            templateId: 1,
            contactId: 4,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[6],
            status: 'DELIVERED',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -5).toISOString(),
            deliveredAt: addMinutes(addDays(baseDate, -5), 3).toISOString(),
            createdAt: addDays(baseDate, -5).toISOString(),
        },
        {
            templateId: 2,
            contactId: 8,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[7],
            status: 'DELIVERED',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -4).toISOString(),
            deliveredAt: addMinutes(addDays(baseDate, -4), 7).toISOString(),
            createdAt: addDays(baseDate, -4).toISOString(),
        },
        {
            templateId: 3,
            contactId: 6,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[8],
            status: 'DELIVERED',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -3).toISOString(),
            deliveredAt: addMinutes(addDays(baseDate, -3), 4).toISOString(),
            createdAt: addDays(baseDate, -3).toISOString(),
        },
        {
            templateId: 1,
            contactId: 10,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[9],
            status: 'DELIVERED',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -2).toISOString(),
            deliveredAt: addMinutes(addDays(baseDate, -2), 6).toISOString(),
            createdAt: addDays(baseDate, -2).toISOString(),
        },
        // READ status (3 messages)
        {
            templateId: 2,
            contactId: 3,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[10],
            status: 'READ',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -7).toISOString(),
            deliveredAt: addMinutes(addDays(baseDate, -7), 5).toISOString(),
            createdAt: addDays(baseDate, -7).toISOString(),
        },
        {
            templateId: 3,
            contactId: 7,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[11],
            status: 'READ',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -6).toISOString(),
            deliveredAt: addMinutes(addDays(baseDate, -6), 4).toISOString(),
            createdAt: addDays(baseDate, -6).toISOString(),
        },
        {
            templateId: 1,
            contactId: 2,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[12],
            status: 'READ',
            metaMessageId: generateWamid(),
            errorMessage: null,
            scheduledAt: null,
            sentAt: addDays(baseDate, -5).toISOString(),
            deliveredAt: addMinutes(addDays(baseDate, -5), 8).toISOString(),
            createdAt: addDays(baseDate, -5).toISOString(),
        },
        // QUEUED status (4 messages)
        {
            templateId: 2,
            contactId: 4,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[13],
            status: 'QUEUED',
            metaMessageId: null,
            errorMessage: null,
            scheduledAt: addDays(new Date(), 1).toISOString(),
            sentAt: null,
            deliveredAt: null,
            createdAt: new Date().toISOString(),
        },
        {
            templateId: 3,
            contactId: 9,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[14],
            status: 'QUEUED',
            metaMessageId: null,
            errorMessage: null,
            scheduledAt: addDays(new Date(), 1).toISOString(),
            sentAt: null,
            deliveredAt: null,
            createdAt: new Date().toISOString(),
        },
        {
            templateId: 1,
            contactId: 5,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[15],
            status: 'QUEUED',
            metaMessageId: null,
            errorMessage: null,
            scheduledAt: addDays(new Date(), 1).toISOString(),
            sentAt: null,
            deliveredAt: null,
            createdAt: new Date().toISOString(),
        },
        {
            templateId: 2,
            contactId: 8,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[16],
            status: 'QUEUED',
            metaMessageId: null,
            errorMessage: null,
            scheduledAt: addDays(new Date(), 1).toISOString(),
            sentAt: null,
            deliveredAt: null,
            createdAt: new Date().toISOString(),
        },
        // FAILED status (3 messages)
        {
            templateId: 3,
            contactId: 1,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[17],
            status: 'FAILED',
            metaMessageId: null,
            errorMessage: errorMessages[0],
            scheduledAt: null,
            sentAt: null,
            deliveredAt: null,
            createdAt: addDays(baseDate, -3).toISOString(),
        },
        {
            templateId: 1,
            contactId: 6,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[18],
            status: 'FAILED',
            metaMessageId: null,
            errorMessage: errorMessages[1],
            scheduledAt: null,
            sentAt: null,
            deliveredAt: null,
            createdAt: addDays(baseDate, -2).toISOString(),
        },
        {
            templateId: 2,
            contactId: 10,
            phoneNumber: generatePhoneNumber(),
            messageContent: messageContents[19],
            status: 'FAILED',
            metaMessageId: null,
            errorMessage: errorMessages[2],
            scheduledAt: null,
            sentAt: null,
            deliveredAt: null,
            createdAt: addDays(baseDate, -1).toISOString(),
        },
    ];

    await db.insert(messageLogs).values(sampleMessageLogs);
    
    console.log('✅ Message logs seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});