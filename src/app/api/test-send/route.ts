import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappConfig, messageLogs, messageTemplates } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * TEST ENDPOINT - Automatic message sending test
 * GET /api/test-send?phone=3219092779&message=Hola%20prueba%20de%20whatsApp
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const testResults: any = {
    timestamp: new Date().toISOString(),
    tests: [],
    success: false,
    messageId: null,
    deliveryStatus: null
  };

  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone') || '3219092779';
    const messageText = searchParams.get('message') || 'Hola prueba de whatsApp';

    // Ensure phone has country code
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+57${phoneNumber}`;

    console.log('🧪 Starting automatic message test...');
    console.log(`📱 Target: ${formattedPhone}`);
    console.log(`💬 Message: "${messageText}"`);

    // TEST 1: Check WhatsApp Configuration
    testResults.tests.push({ name: 'Configuration Check', status: 'running' });
    const configs = await db.select().from(whatsappConfig).limit(1);
    
    if (configs.length === 0) {
      testResults.tests[0].status = 'failed';
      testResults.tests[0].error = 'WhatsApp configuration not found';
      testResults.error = 'No WhatsApp configuration found. Please configure in Dashboard first.';
      return NextResponse.json(testResults, { status: 500 });
    }

    const config = configs[0];
    testResults.tests[0].status = 'passed';
    testResults.tests[0].data = {
      phoneNumberId: config.phoneNumberId,
      hasAccessToken: !!config.accessToken,
      isVerified: config.isVerified
    };

    if (!config.isVerified) {
      testResults.tests.push({
        name: 'Connection Status',
        status: 'failed',
        error: 'WhatsApp not verified. Verify credentials in Dashboard.'
      });
      testResults.error = 'WhatsApp is not verified';
      return NextResponse.json(testResults, { status: 500 });
    }

    // TEST 2: Get or Create Test Template
    testResults.tests.push({ name: 'Template Check', status: 'running' });
    let template = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.status, 'APPROVED'))
      .orderBy(desc(messageTemplates.updatedAt))
      .limit(1);

    if (template.length === 0) {
      testResults.tests[1].status = 'failed';
      testResults.tests[1].error = 'No approved templates found';
      testResults.error = 'No approved templates. Create and approve a template first.';
      return NextResponse.json(testResults, { status: 500 });
    }

    testResults.tests[1].status = 'passed';
    testResults.tests[1].data = {
      templateId: template[0].id,
      templateName: template[0].name,
      category: template[0].category,
      language: template[0].language
    };

    // TEST 3: Send Message via WhatsApp API
    testResults.tests.push({ name: 'Send Message via WhatsApp API', status: 'running' });
    
    const whatsappApiUrl = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;
    
    // Build message payload - use template
    const messagePayload: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: template[0].name,
        language: {
          code: template[0].language || 'es'
        }
      }
    };

    // Add components if template has variables
    const templateVariables = typeof template[0].variables === 'string' 
      ? JSON.parse(template[0].variables) 
      : Array.isArray(template[0].variables) 
        ? template[0].variables 
        : [];

    if (templateVariables.length > 0) {
      messagePayload.template.components = [{
        type: 'body',
        parameters: templateVariables.map(() => ({
          type: 'text',
          text: 'Test'
        }))
      }];
    }

    console.log('📤 Sending to WhatsApp API:', JSON.stringify(messagePayload, null, 2));

    const whatsappResponse = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    const whatsappData = await whatsappResponse.json();
    console.log('📥 WhatsApp API Response:', JSON.stringify(whatsappData, null, 2));

    if (!whatsappResponse.ok) {
      testResults.tests[2].status = 'failed';
      testResults.tests[2].error = whatsappData.error?.message || 'Failed to send message';
      testResults.tests[2].response = whatsappData;
      testResults.error = `WhatsApp API Error: ${whatsappData.error?.message || 'Unknown error'}`;
      return NextResponse.json(testResults, { status: 500 });
    }

    const metaMessageId = whatsappData.messages?.[0]?.id;
    
    if (!metaMessageId) {
      testResults.tests[2].status = 'failed';
      testResults.tests[2].error = 'No message ID returned from WhatsApp';
      testResults.error = 'WhatsApp did not return a message ID';
      return NextResponse.json(testResults, { status: 500 });
    }

    testResults.tests[2].status = 'passed';
    testResults.tests[2].data = {
      metaMessageId,
      response: whatsappData
    };
    testResults.messageId = metaMessageId;

    // TEST 4: Save to Database
    testResults.tests.push({ name: 'Save to Database', status: 'running' });
    
    const dbRecord = await db.insert(messageLogs).values({
      phoneNumber: formattedPhone,
      messageContent: template[0].content,
      templateId: template[0].id,
      status: 'sent',
      metaMessageId,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }).returning();

    testResults.tests[3].status = 'passed';
    testResults.tests[3].data = {
      recordId: dbRecord[0].id,
      saved: true
    };

    // TEST 5: Wait and Check Webhook Status (5 seconds)
    testResults.tests.push({ name: 'Webhook Status Check', status: 'running' });
    
    console.log('⏳ Waiting 5 seconds for webhook status update...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const updatedMessage = await db
      .select()
      .from(messageLogs)
      .where(eq(messageLogs.metaMessageId, metaMessageId))
      .limit(1);

    if (updatedMessage.length > 0) {
      testResults.tests[4].status = 'passed';
      testResults.tests[4].data = {
        status: updatedMessage[0].status,
        deliveredAt: updatedMessage[0].deliveredAt,
        updatedAt: updatedMessage[0].updatedAt
      };
      testResults.deliveryStatus = updatedMessage[0].status;
    } else {
      testResults.tests[4].status = 'warning';
      testResults.tests[4].message = 'Message sent but webhook status not updated yet';
    }

    // SUCCESS
    testResults.success = true;
    testResults.executionTime = `${Date.now() - startTime}ms`;
    testResults.message = `✅ Test completed successfully! Message sent to ${formattedPhone}`;

    console.log('✅ All tests passed!');
    return NextResponse.json(testResults, { status: 200 });

  } catch (error) {
    console.error('❌ Test failed:', error);
    testResults.success = false;
    testResults.error = error instanceof Error ? error.message : 'Unknown error';
    testResults.executionTime = `${Date.now() - startTime}ms`;
    return NextResponse.json(testResults, { status: 500 });
  }
}