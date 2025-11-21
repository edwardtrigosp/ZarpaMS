import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumberId, accessToken, businessAccountId } = body;

    // Validate all required fields are present
    const trimmedPhoneNumberId = phoneNumberId?.trim();
    const trimmedAccessToken = accessToken?.trim();
    const trimmedBusinessAccountId = businessAccountId?.trim();

    if (!trimmedPhoneNumberId || !trimmedAccessToken || !trimmedBusinessAccountId) {
      return NextResponse.json(
        {
          error: 'All fields are required: phoneNumberId, accessToken, businessAccountId',
          code: 'MISSING_REQUIRED_FIELDS',
        },
        { status: 400 }
      );
    }

    // Find existing config record (should be id=1)
    const existingConfig = await db
      .select()
      .from(whatsappConfig)
      .where(eq(whatsappConfig.id, 1))
      .limit(1);

    if (existingConfig.length === 0) {
      return NextResponse.json(
        {
          error: 'WhatsApp configuration not found. Please save config first.',
          code: 'CONFIG_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Update the config record with isVerified=true and current timestamp
    const updated = await db
      .update(whatsappConfig)
      .set({
        isVerified: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(whatsappConfig.id, 1))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update WhatsApp configuration',
          code: 'UPDATE_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        verified: true,
        message: 'WhatsApp connection verified successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      },
      { status: 500 }
    );
  }
}