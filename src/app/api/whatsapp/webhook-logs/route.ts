import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { webhookEvents } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    
    // Parse and validate limit parameter
    let limit = 50; // default
    if (limitParam) {
      const parsedLimit = parseInt(limitParam);
      if (isNaN(parsedLimit) || parsedLimit <= 0) {
        return NextResponse.json(
          { 
            error: 'Limit must be a positive integer',
            code: 'INVALID_LIMIT'
          },
          { status: 400 }
        );
      }
      limit = Math.min(parsedLimit, 100); // max 100
    }

    // Fetch webhook events ordered by most recent first
    const events = await db
      .select()
      .from(webhookEvents)
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit);

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('GET webhook events error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, rawPayload, messageId, phoneNumber, status, processed, errorMessage } = body;

    // Validate required fields
    if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
      return NextResponse.json(
        { 
          error: 'eventType is required and must be a non-empty string',
          code: 'MISSING_EVENT_TYPE'
        },
        { status: 400 }
      );
    }

    if (!rawPayload) {
      return NextResponse.json(
        { 
          error: 'rawPayload is required',
          code: 'MISSING_RAW_PAYLOAD'
        },
        { status: 400 }
      );
    }

    // Prepare data for insertion
    const webhookEventData = {
      eventType: eventType.trim(),
      rawPayload,
      messageId: messageId || null,
      phoneNumber: phoneNumber || null,
      status: status || null,
      processed: processed !== undefined ? processed : false,
      errorMessage: errorMessage || null,
      createdAt: new Date().toISOString(),
    };

    // Insert webhook event and return the created record
    const [newWebhookEvent] = await db
      .insert(webhookEvents)
      .values(webhookEventData)
      .returning();

    return NextResponse.json(newWebhookEvent, { status: 201 });
  } catch (error) {
    console.error('POST webhook event error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Delete all webhook events and get the deleted records
    const deleted = await db
      .delete(webhookEvents)
      .returning();

    const deletedCount = deleted.length;

    return NextResponse.json(
      {
        success: true,
        message: `Deleted ${deletedCount} webhook log${deletedCount !== 1 ? 's' : ''}`,
        deletedCount
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE webhook events error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}