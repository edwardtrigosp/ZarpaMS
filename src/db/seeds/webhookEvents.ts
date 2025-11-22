import { db } from '@/db';
import { webhookEvents } from '@/db/schema';

async function main() {
    const sampleWebhookEvents = [
        // Recent verification events (3)
        {
            eventType: 'verification',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    time: 1704067200000,
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            }
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: null,
            phoneNumber: null,
            status: null,
            processed: true,
            errorMessage: null,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            eventType: 'verification',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    time: 1703980800000,
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215559876543',
                                phone_number_id: '123456789012345'
                            }
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: null,
            phoneNumber: null,
            status: null,
            processed: true,
            errorMessage: null,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            eventType: 'verification',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    time: 1703808000000,
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215552468135',
                                phone_number_id: '123456789012345'
                            }
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: null,
            phoneNumber: null,
            status: null,
            processed: true,
            errorMessage: null,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        // Message status events (4)
        {
            eventType: 'message_status',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            },
                            statuses: [{
                                id: 'wamid.HBgNMTc4NzYwNDUyNjMVAgARGBI5MTBCQ0ExRkYyMEQzMzY2RDQA',
                                status: 'delivered',
                                timestamp: '1704153600',
                                recipient_id: '5215557891234',
                                conversation: {
                                    id: 'conversation_id_123',
                                    origin: {
                                        type: 'business_initiated'
                                    }
                                },
                                pricing: {
                                    pricing_model: 'CBP',
                                    billable: true,
                                    category: 'business_initiated'
                                }
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: 'wamid.HBgNMTc4NzYwNDUyNjMVAgARGBI5MTBCQ0ExRkYyMEQzMzY2RDQA',
            phoneNumber: '+5215557891234',
            status: 'delivered',
            processed: true,
            errorMessage: null,
            createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
            eventType: 'message_status',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            },
                            statuses: [{
                                id: 'wamid.HBgNMTc4NzYwNDUyNjMVAgARGBI4NTZEQzRBMkFGNDIzQjY3RTMA',
                                status: 'delivered',
                                timestamp: '1704067200',
                                recipient_id: '5215558765432',
                                conversation: {
                                    id: 'conversation_id_456',
                                    origin: {
                                        type: 'business_initiated'
                                    }
                                },
                                pricing: {
                                    pricing_model: 'CBP',
                                    billable: true,
                                    category: 'business_initiated'
                                }
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: 'wamid.HBgNMTc4NzYwNDUyNjMVAgARGBI4NTZEQzRBMkFGNDIzQjY3RTMA',
            phoneNumber: '+5215558765432',
            status: 'delivered',
            processed: true,
            errorMessage: null,
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            eventType: 'message_status',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            },
                            statuses: [{
                                id: 'wamid.HBgNMTc4NzYwNDUyNjMVAgARGBI3QjI5RjhBMjNCNDU2OTBDMTFA',
                                status: 'read',
                                timestamp: '1703980800',
                                recipient_id: '5215559638527',
                                conversation: {
                                    id: 'conversation_id_789',
                                    origin: {
                                        type: 'user_initiated'
                                    }
                                }
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: 'wamid.HBgNMTc4NzYwNDUyNjMVAgARGBI3QjI5RjhBMjNCNDU2OTBDMTFA',
            phoneNumber: '+5215559638527',
            status: 'read',
            processed: true,
            errorMessage: null,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            eventType: 'message_status',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            },
                            statuses: [{
                                id: 'wamid.HBgNMTc4NzYwNDUyNjMVAgARGBI2RDM4RTVBNENCNDc1QzlBREVA',
                                status: 'failed',
                                timestamp: '1703894400',
                                recipient_id: '5215551597534',
                                errors: [{
                                    code: 131047,
                                    title: 'Re-engagement message',
                                    message: 'Re-engagement message failed to send because more than 24 hours have passed since the customer last replied to this number',
                                    error_data: {
                                        details: 'Message failed to send because more than 24 hours have passed since the customer last replied to this number.'
                                    }
                                }]
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: 'wamid.HBgNMTc4NzYwNDUyNjMVAgARGBI2RDM4RTVBNENCNDc1QzlBREVA',
            phoneNumber: '+5215551597534',
            status: 'failed',
            processed: true,
            errorMessage: null,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        // Incoming message events (3)
        {
            eventType: 'incoming_message',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            },
                            contacts: [{
                                profile: {
                                    name: 'Carlos Rodriguez'
                                },
                                wa_id: '5215557412589'
                            }],
                            messages: [{
                                from: '5215557412589',
                                id: 'wamid.HBgNMTc4NzYwNDUyNjMVAgASGBQzQTU2QkY5RkI4MjNENDdCQ0U2RTQA',
                                timestamp: '1704153600',
                                text: {
                                    body: 'Hola, me gustaría información sobre sus productos'
                                },
                                type: 'text'
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: 'wamid.HBgNMTc4NzYwNDUyNjMVAgASGBQzQTU2QkY5RkI4MjNENDdCQ0U2RTQA',
            phoneNumber: '+5215557412589',
            status: null,
            processed: true,
            errorMessage: null,
            createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
            eventType: 'incoming_message',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            },
                            contacts: [{
                                profile: {
                                    name: 'María González'
                                },
                                wa_id: '5215558523697'
                            }],
                            messages: [{
                                from: '5215558523697',
                                id: 'wamid.HBgNMTc4NzYwNDUyNjMVAgASGBQ0QjY3QzNBREY5MjREMzhCRkY1RTMA',
                                timestamp: '1703980800',
                                text: {
                                    body: '¿Cuál es el horario de atención?'
                                },
                                type: 'text'
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: 'wamid.HBgNMTc4NzYwNDUyNjMVAgASGBQ0QjY3QzNBREY5MjREMzhCRkY1RTMA',
            phoneNumber: '+5215558523697',
            status: null,
            processed: true,
            errorMessage: null,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            eventType: 'incoming_message',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            },
                            contacts: [{
                                profile: {
                                    name: 'Juan Pérez'
                                },
                                wa_id: '5215559874521'
                            }],
                            messages: [{
                                from: '5215559874521',
                                id: 'wamid.INVALID_FORMAT_TEST',
                                timestamp: '1703808000',
                                text: {
                                    body: 'Gracias por la información'
                                },
                                type: 'text'
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: 'wamid.INVALID_FORMAT_TEST',
            phoneNumber: '+5215559874521',
            status: null,
            processed: false,
            errorMessage: 'Invalid message ID format',
            createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        },
        // Error events (2)
        {
            eventType: 'error',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            },
                            errors: [{
                                code: 500,
                                title: 'Internal Server Error',
                                message: 'An internal server error occurred',
                                error_data: {
                                    details: 'Failed to process webhook event'
                                }
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: null,
            phoneNumber: null,
            status: null,
            processed: false,
            errorMessage: 'Failed to update message log',
            createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        },
        {
            eventType: 'error',
            rawPayload: {
                object: 'whatsapp_business_account',
                entry: [{
                    id: '1234567890',
                    changes: [{
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '5215551234567',
                                phone_number_id: '123456789012345'
                            },
                            errors: [{
                                code: 131026,
                                title: 'Message Undeliverable',
                                message: 'Message failed to send because the recipient phone number is not a WhatsApp number',
                                error_data: {
                                    details: 'Phone number 5215556543210 is not registered on WhatsApp'
                                }
                            }]
                        },
                        field: 'messages'
                    }]
                }]
            },
            messageId: 'wamid.HBgNMTc4NzYwNDUyNjMVAgARGBI1QzkyRjNCNEE3MjhENEY4OTNFA',
            phoneNumber: '+5215556543210',
            status: null,
            processed: false,
            errorMessage: 'Failed to update message log',
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        },
    ];

    await db.insert(webhookEvents).values(sampleWebhookEvents);
    
    console.log('✅ Webhook events seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});