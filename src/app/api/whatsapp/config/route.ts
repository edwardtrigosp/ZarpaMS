import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateApiKey, sanitizeConfigForClient, addSecurityHeaders, rateLimit, logSecurityEvent } from '@/lib/security';

// Rate limiter: 10 requests per minute
const rateLimiter = rateLimit({ windowMs: 60000, maxRequests: 10 });

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateCheck = await rateLimiter(request);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/whatsapp/config',
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'X-RateLimit-Remaining': rateCheck.remaining.toString() } }
      );
    }

    // Validate API key
    const authCheck = validateApiKey(request);
    if (!authCheck.valid) {
      logSecurityEvent({
        type: 'AUTH_FAILURE',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/whatsapp/config',
        details: authCheck.error,
      });
      return NextResponse.json(
        { error: authCheck.error, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const config = await db.select()
      .from(whatsappConfig)
      .limit(1);

    if (config.length === 0) {
      return NextResponse.json({ 
        error: 'WhatsApp configuration not found',
        code: 'CONFIG_NOT_FOUND' 
      }, { status: 404 });
    }

    // ✅ SECURITY FIX: Remove sensitive data before sending to client
    const sanitizedConfig = sanitizeConfigForClient(config[0]);

    const response = NextResponse.json(sanitizedConfig, { status: 200 });
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateCheck = await rateLimiter(request);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/whatsapp/config',
      });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate API key
    const authCheck = validateApiKey(request);
    if (!authCheck.valid) {
      logSecurityEvent({
        type: 'AUTH_FAILURE',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/whatsapp/config',
      });
      return NextResponse.json(
        { error: authCheck.error, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

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

      const sanitizedConfig = sanitizeConfigForClient(updated[0]);
      const response = NextResponse.json(sanitizedConfig, { status: 200 });
      return addSecurityHeaders(response);
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

      const sanitizedConfig = sanitizeConfigForClient(newConfig[0]);
      const response = NextResponse.json(sanitizedConfig, { status: 201 });
      return addSecurityHeaders(response);
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 });
  }
}