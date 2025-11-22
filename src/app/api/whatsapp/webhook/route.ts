import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappConfig, messageLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET - Webhook Verification (Meta challenges the webhook)
 * Meta sends: hub.mode, hub.verify_token, hub.challenge
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('Webhook verification attempt:', { mode, token: token ? '***' : null, challenge });

    // Check if a token and mode were sent
    if (!mode || !token) {
      return NextResponse.json(
        { error: 'Missing hub.mode or hub.verify_token' },
        { status: 403 }
      );
    }

    // Get stored verify token from database
    const configs = await db.select().from(whatsappConfig).limit(1);
    
    if (configs.length === 0) {
      console.error('No WhatsApp config found in database');
      return NextResponse.json(
        { error: 'WhatsApp configuration not found' },
        { status: 403 }
      );
    }

    const config = configs[0];
    const verifyToken = config.webhookVerifyToken;

    // Check the mode and token sent are correct
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      
      // Respond with the challenge token from the request
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.error('Webhook verification failed: token mismatch');
      return NextResponse.json(
        { error: 'Verification token mismatch' },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 500 }
    );
  }
}

/**
 * POST - Receive WhatsApp webhook events
 * Meta sends status updates and message events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Webhook event received:', JSON.stringify(body, null, 2));

    // Validate webhook structure
    if (!body.object || body.object !== 'whatsapp_business_account') {
      console.log('Invalid webhook object type:', body.object);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // Process each entry
    for (const entry of body.entry || []) {
      // Process each change in the entry
      for (const change of entry.changes || []) {
        // Only process message status updates
        if (change.field === 'messages') {
          await processMessageStatusUpdate(change.value);
        }
      }
    }

    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }
    );
  }
}

/**
 * Process message status updates from WhatsApp
 */
async function processMessageStatusUpdate(value: any) {
  try {
    const statuses = value.statuses || [];
    
    for (const statusUpdate of statuses) {
      const messageId = statusUpdate.id; // WhatsApp message ID
      const status = statusUpdate.status; // sent, delivered, read, failed
      const timestamp = statusUpdate.timestamp; // Unix timestamp
      const recipientId = statusUpdate.recipient_id; // Phone number

      console.log('Processing status update:', {
        messageId,
        status,
        timestamp,
        recipientId
      });

      // Find message in database by Meta message ID
      const messages = await db
        .select()
        .from(messageLogs)
        .where(eq(messageLogs.metaMessageId, messageId))
        .limit(1);

      if (messages.length === 0) {
        console.log(`Message not found in database: ${messageId}`);
        continue;
      }

      const message = messages[0];

      // Prepare update data
      const updateData: any = {
        status: mapWhatsAppStatus(status),
        updatedAt: new Date().toISOString(),
      };

      // Set timestamp for delivered status
      if (status === 'delivered' && timestamp) {
        updateData.deliveredAt = new Date(parseInt(timestamp) * 1000).toISOString();
      }

      // Set sent timestamp if not already set
      if (status === 'sent' && !message.sentAt && timestamp) {
        updateData.sentAt = new Date(parseInt(timestamp) * 1000).toISOString();
      }

      // Handle errors
      if (status === 'failed') {
        const errors = statusUpdate.errors || [];
        if (errors.length > 0) {
          const errorDetails = errors.map((err: any) => 
            `${err.title || 'Error'}: ${err.message || 'Unknown error'} (Code: ${err.code || 'N/A'})`
          ).join('; ');
          updateData.errorMessage = errorDetails;
        } else {
          updateData.errorMessage = 'Message delivery failed';
        }
      }

      // Update message in database
      await db
        .update(messageLogs)
        .set(updateData)
        .where(eq(messageLogs.id, message.id));

      console.log(`Message ${messageId} status updated to: ${status}`);
    }

    // Process incoming messages (if user replies)
    const messages = value.messages || [];
    for (const incomingMessage of messages) {
      console.log('Incoming message received:', {
        from: incomingMessage.from,
        type: incomingMessage.type,
        timestamp: incomingMessage.timestamp
      });
      
      // You can implement incoming message handling here
      // For now, we just log it
    }
  } catch (error) {
    console.error('Error processing message status:', error);
    throw error;
  }
}

/**
 * Map WhatsApp status to our internal status
 */
function mapWhatsAppStatus(whatsappStatus: string): string {
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed',
  };

  return statusMap[whatsappStatus] || 'pending';
}
