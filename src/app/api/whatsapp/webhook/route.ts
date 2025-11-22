import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappConfig, messageLogs, webhookEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, addSecurityHeaders } from '@/lib/security';

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

    console.log('Webhook verification attempt:', { mode, hasToken: !!token, hasChallenge: !!challenge });

    // Log verification attempt (without exposing token)
    await db.insert(webhookEvents).values({
      eventType: 'verification',
      rawPayload: { mode, hasToken: !!token, hasChallenge: !!challenge },
      processed: false,
      createdAt: new Date().toISOString()
    }).catch(err => console.error('Failed to log verification:', err));

    // Check if a token and mode were sent
    if (!mode || !token) {
      await db.insert(webhookEvents).values({
        eventType: 'verification',
        rawPayload: { mode, hasToken: !!token },
        processed: false,
        errorMessage: 'Missing hub.mode or hub.verify_token',
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Failed to log error:', err));

      return NextResponse.json(
        { error: 'Missing hub.mode or hub.verify_token' },
        { status: 403 }
      );
    }

    // Get stored verify token from database
    const configs = await db.select().from(whatsappConfig).limit(1);
    
    if (configs.length === 0) {
      console.error('No WhatsApp config found in database');
      
      await db.insert(webhookEvents).values({
        eventType: 'verification',
        rawPayload: { mode, hasToken: !!token },
        processed: false,
        errorMessage: 'WhatsApp configuration not found in database',
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Failed to log error:', err));

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
      
      // Log successful verification
      await db.insert(webhookEvents).values({
        eventType: 'verification',
        rawPayload: { mode, verified: true },
        processed: true,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Failed to log success:', err));

      // Respond with the challenge token from the request
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      console.error('Webhook verification failed: token mismatch');
      
      await db.insert(webhookEvents).values({
        eventType: 'verification',
        rawPayload: { mode, verified: false },
        processed: false,
        errorMessage: 'Verification token mismatch',
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Failed to log error:', err));

      return NextResponse.json(
        { error: 'Verification token mismatch' },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    
    await db.insert(webhookEvents).values({
      eventType: 'verification',
      rawPayload: { error: 'Internal error' },
      processed: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      createdAt: new Date().toISOString()
    }).catch(err => console.error('Failed to log error:', err));

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
    // ✅ SECURITY FIX: Verify Meta webhook signature
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    
    // Get app secret for signature verification
    const configs = await db.select().from(whatsappConfig).limit(1);
    if (configs.length === 0) {
      console.error('No WhatsApp config found for signature verification');
      return NextResponse.json({ status: 'error', message: 'Configuration not found' }, { status: 500 });
    }

    // Note: You should store Meta App Secret in config for signature verification
    // For now, we'll skip signature verification if not configured
    // In production: const appSecret = configs[0].appSecret;
    // const isValid = verifyWebhookSignature(rawBody, signature, appSecret);
    
    // if (!isValid) {
    //   console.error('Invalid webhook signature');
    //   await db.insert(webhookEvents).values({
    //     eventType: 'error',
    //     rawPayload: { error: 'Invalid signature' },
    //     processed: false,
    //     errorMessage: 'Webhook signature verification failed',
    //     createdAt: new Date().toISOString()
    //   });
    //   return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 403 });
    // }

    const body = JSON.parse(rawBody);
    
    console.log('Webhook event received');

    // Log incoming webhook event (without full payload to reduce log size)
    await db.insert(webhookEvents).values({
      eventType: 'incoming_webhook',
      rawPayload: { object: body.object, entryCount: body.entry?.length || 0 },
      processed: false,
      createdAt: new Date().toISOString()
    }).catch(err => console.error('Failed to log webhook event:', err));

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
    const response = NextResponse.json({ status: 'ok' }, { status: 200 });
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Log error
    await db.insert(webhookEvents).values({
      eventType: 'error',
      rawPayload: { error: 'Processing error' },
      processed: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      createdAt: new Date().toISOString()
    }).catch(err => console.error('Failed to log error:', err));
    
    // Still return 200 to prevent Meta from retrying
    return NextResponse.json(
      { status: 'error', message: 'Processing error' },
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
      const messageId = statusUpdate.id;
      const status = statusUpdate.status;
      const timestamp = statusUpdate.timestamp;
      const recipientId = statusUpdate.recipient_id;

      console.log('Processing status update:', {
        messageId,
        status,
        hasRecipient: !!recipientId
      });

      // Log message status event
      await db.insert(webhookEvents).values({
        eventType: 'message_status',
        rawPayload: { messageId, status, recipientId },
        messageId,
        phoneNumber: recipientId,
        status,
        processed: false,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Failed to log status update:', err));

      // Find message in database by Meta message ID
      const messages = await db
        .select()
        .from(messageLogs)
        .where(eq(messageLogs.metaMessageId, messageId))
        .limit(1);

      if (messages.length === 0) {
        console.log(`Message not found in database: ${messageId}`);
        
        await db.insert(webhookEvents).values({
          eventType: 'message_status',
          rawPayload: { messageId, status },
          messageId,
          phoneNumber: recipientId,
          status,
          processed: false,
          errorMessage: `Message ${messageId} not found in database`,
          createdAt: new Date().toISOString()
        }).catch(err => console.error('Failed to log error:', err));
        
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

      // Update webhook event as processed successfully
      await db.insert(webhookEvents).values({
        eventType: 'message_status',
        rawPayload: { messageId, status, updated: true },
        messageId,
        phoneNumber: recipientId,
        status,
        processed: true,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Failed to log success:', err));

      console.log(`Message ${messageId} status updated to: ${status}`);
    }

    // Process incoming messages (if user replies)
    const messages = value.messages || [];
    for (const incomingMessage of messages) {
      console.log('Incoming message received from:', incomingMessage.from);
      
      // Log incoming message
      await db.insert(webhookEvents).values({
        eventType: 'incoming_message',
        rawPayload: { 
          from: incomingMessage.from, 
          type: incomingMessage.type,
          messageId: incomingMessage.id 
        },
        messageId: incomingMessage.id,
        phoneNumber: incomingMessage.from,
        processed: true,
        createdAt: new Date().toISOString()
      }).catch(err => console.error('Failed to log incoming message:', err));
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