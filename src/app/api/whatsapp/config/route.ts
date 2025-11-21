import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const config = await db.select()
      .from(whatsappConfig)
      .limit(1);

    if (config.length === 0) {
      return NextResponse.json({ 
        error: 'WhatsApp configuration not found',
        code: 'CONFIG_NOT_FOUND' 
      }, { status: 404 });
    }

    return NextResponse.json(config[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      phoneNumberId,
      accessToken,
      businessAccountId,
      webhookVerifyToken,
      isVerified,
      dailyLimit,
      peakLimit
    } = body;

    // Validate required fields
    if (!phoneNumberId || !accessToken || !businessAccountId || !webhookVerifyToken) {
      return NextResponse.json({ 
        error: 'Missing required fields: phoneNumberId, accessToken, businessAccountId, webhookVerifyToken',
        code: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    // Trim text inputs
    const trimmedPhoneNumberId = phoneNumberId.trim();
    const trimmedAccessToken = accessToken.trim();
    const trimmedBusinessAccountId = businessAccountId.trim();
    const trimmedWebhookVerifyToken = webhookVerifyToken.trim();

    // Validate non-empty after trimming
    if (!trimmedPhoneNumberId || !trimmedAccessToken || !trimmedBusinessAccountId || !trimmedWebhookVerifyToken) {
      return NextResponse.json({ 
        error: 'Required fields cannot be empty strings',
        code: 'MISSING_REQUIRED_FIELDS' 
      }, { status: 400 });
    }

    // Validate dailyLimit and peakLimit if provided
    if (dailyLimit !== undefined && (!Number.isInteger(dailyLimit) || dailyLimit <= 0)) {
      return NextResponse.json({ 
        error: 'dailyLimit must be a positive integer',
        code: 'INVALID_DAILY_LIMIT' 
      }, { status: 400 });
    }

    if (peakLimit !== undefined && (!Number.isInteger(peakLimit) || peakLimit <= 0)) {
      return NextResponse.json({ 
        error: 'peakLimit must be a positive integer',
        code: 'INVALID_PEAK_LIMIT' 
      }, { status: 400 });
    }

    // Check if config exists
    const existingConfig = await db.select()
      .from(whatsappConfig)
      .limit(1);

    const timestamp = new Date().toISOString();

    if (existingConfig.length > 0) {
      // Update existing config
      const updateData: any = {
        phoneNumberId: trimmedPhoneNumberId,
        accessToken: trimmedAccessToken,
        businessAccountId: trimmedBusinessAccountId,
        webhookVerifyToken: trimmedWebhookVerifyToken,
        updatedAt: timestamp
      };

      if (isVerified !== undefined) {
        updateData.isVerified = isVerified;
      }

      if (dailyLimit !== undefined) {
        updateData.dailyLimit = dailyLimit;
      }

      if (peakLimit !== undefined) {
        updateData.peakLimit = peakLimit;
      }

      const updated = await db.update(whatsappConfig)
        .set(updateData)
        .where(eq(whatsappConfig.id, existingConfig[0].id))
        .returning();

      return NextResponse.json(updated[0], { status: 200 });
    } else {
      // Create new config
      const newConfig = await db.insert(whatsappConfig)
        .values({
          phoneNumberId: trimmedPhoneNumberId,
          accessToken: trimmedAccessToken,
          businessAccountId: trimmedBusinessAccountId,
          webhookVerifyToken: trimmedWebhookVerifyToken,
          isVerified: isVerified ?? false,
          dailyLimit: dailyLimit ?? 1000,
          peakLimit: peakLimit ?? 10000,
          createdAt: timestamp,
          updatedAt: timestamp
        })
        .returning();

      return NextResponse.json(newConfig[0], { status: 201 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}