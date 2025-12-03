import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateApiKey, addSecurityHeaders, rateLimit, logSecurityEvent } from '@/lib/security';

// Rate limiter: 10 requests per minute
const rateLimiter = rateLimit({ windowMs: 60000, maxRequests: 10 });

/**
 * GET - Check messaging tier from Meta WhatsApp Business API
 * Returns the current tier and limits from Meta
 */
export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateCheck = await rateLimiter(request);
    if (!rateCheck.allowed) {
      logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/whatsapp/check-tier',
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
        endpoint: '/api/whatsapp/check-tier',
      });
      return NextResponse.json(
        { error: authCheck.error, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get WhatsApp configuration
    const configs = await db.select().from(whatsappConfig).limit(1);
    
    if (configs.length === 0) {
      return NextResponse.json(
        { 
          error: 'WhatsApp configuration not found',
          code: 'CONFIG_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const config = configs[0];

    // Query Meta's Graph API for phone number info including tier
    const phoneNumberUrl = `https://graph.facebook.com/v18.0/${config.phoneNumberId}?fields=quality_rating,messaging_limit_tier`;
    
    console.log('📡 Checking tier from Meta API...');
    const response = await fetch(phoneNumberUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Meta API Error:', errorData);
      
      return NextResponse.json({
        error: errorData.error?.message || 'Failed to fetch tier from Meta',
        code: 'META_API_ERROR',
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Meta API Response:', data);

    // Parse tier information
    const tier = data.messaging_limit_tier || 'TIER_NOT_SET';
    const qualityRating = data.quality_rating || 'UNKNOWN';

    // Map tier to message limit
    const tierLimits: Record<string, number> = {
      'TIER_50': 50,
      'TIER_250': 250,
      'TIER_1K': 1000,
      'TIER_10K': 10000,
      'TIER_100K': 100000,
      'TIER_UNLIMITED': 1000000,
    };

    const peakLimit = tierLimits[tier] || config.peakLimit;

    const response_data = NextResponse.json({
      success: true,
      tier,
      peakLimit,
      qualityRating,
      phoneNumberId: config.phoneNumberId,
      currentStoredLimit: config.peakLimit,
      needsUpdate: config.peakLimit !== peakLimit
    }, { status: 200 });

    return addSecurityHeaders(response_data);

  } catch (error) {
    console.error('❌ Error checking tier:', error);
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST - Update stored tier limit from Meta
 * Fetches current tier and updates database
 */
export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateCheck = await rateLimiter(request);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate API key
    const authCheck = validateApiKey(request);
    if (!authCheck.valid) {
      return NextResponse.json(
        { error: authCheck.error, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get WhatsApp configuration
    const configs = await db.select().from(whatsappConfig).limit(1);
    
    if (configs.length === 0) {
      return NextResponse.json(
        { 
          error: 'WhatsApp configuration not found',
          code: 'CONFIG_NOT_FOUND' 
        },
        { status: 404 }
      );
    }

    const config = configs[0];

    // Query Meta's Graph API for phone number info including tier
    const phoneNumberUrl = `https://graph.facebook.com/v18.0/${config.phoneNumberId}?fields=quality_rating,messaging_limit_tier`;
    
    console.log('📡 Fetching tier from Meta API to update...');
    const response = await fetch(phoneNumberUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Meta API Error:', errorData);
      
      return NextResponse.json({
        error: errorData.error?.message || 'Failed to fetch tier from Meta',
        code: 'META_API_ERROR',
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    const tier = data.messaging_limit_tier || 'TIER_NOT_SET';
    const qualityRating = data.quality_rating || 'UNKNOWN';

    // Map tier to message limit
    const tierLimits: Record<string, number> = {
      'TIER_50': 50,
      'TIER_250': 250,
      'TIER_1K': 1000,
      'TIER_10K': 10000,
      'TIER_100K': 100000,
      'TIER_UNLIMITED': 1000000,
    };

    const newPeakLimit = tierLimits[tier] || config.peakLimit;

    // Update database with new tier limit
    const updated = await db
      .update(whatsappConfig)
      .set({
        peakLimit: newPeakLimit,
        updatedAt: new Date().toISOString()
      })
      .where(eq(whatsappConfig.id, config.id))
      .returning();

    console.log(`✅ Tier updated: ${tier} (${newPeakLimit} messages/24h)`);

    const response_data = NextResponse.json({
      success: true,
      message: 'Tier actualizado exitosamente',
      tier,
      previousLimit: config.peakLimit,
      newLimit: newPeakLimit,
      qualityRating,
      updated: updated[0]
    }, { status: 200 });

    return addSecurityHeaders(response_data);

  } catch (error) {
    console.error('❌ Error updating tier:', error);
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
