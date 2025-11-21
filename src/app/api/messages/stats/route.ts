import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { rateLimitTracking, whatsappConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get date from query param or use current date
    const dateParam = searchParams.get('date');
    const today = new Date();
    const queryDate = dateParam || today.toISOString().split('T')[0];
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(queryDate)) {
      return NextResponse.json(
        { 
          error: 'Invalid date format. Expected YYYY-MM-DD',
          code: 'INVALID_DATE_FORMAT' 
        },
        { status: 400 }
      );
    }

    // Query rate limit tracking for the specified date
    const trackingRecords = await db
      .select()
      .from(rateLimitTracking)
      .where(eq(rateLimitTracking.date, queryDate))
      .limit(1);

    // Query whatsapp config to get limits
    const configRecords = await db
      .select()
      .from(whatsappConfig)
      .limit(1);

    // Get limits from config or use defaults
    const dailyLimit = configRecords.length > 0 && configRecords[0].dailyLimit 
      ? configRecords[0].dailyLimit 
      : 1000;
    const peakLimit = configRecords.length > 0 && configRecords[0].peakLimit 
      ? configRecords[0].peakLimit 
      : 10000;

    // Get counts from tracking or use zeros if no record exists
    const dailyCount = trackingRecords.length > 0 && trackingRecords[0].dailyCount !== null
      ? trackingRecords[0].dailyCount
      : 0;
    const peakCount = trackingRecords.length > 0 && trackingRecords[0].peakCount !== null
      ? trackingRecords[0].peakCount
      : 0;

    // Calculate remaining and utilization
    const remainingDaily = Math.max(0, dailyLimit - dailyCount);
    const remainingPeak = Math.max(0, peakLimit - peakCount);
    const utilizationDaily = dailyLimit > 0 
      ? parseFloat(((dailyCount / dailyLimit) * 100).toFixed(2))
      : 0;
    const utilizationPeak = peakLimit > 0 
      ? parseFloat(((peakCount / peakLimit) * 100).toFixed(2))
      : 0;

    return NextResponse.json({
      date: queryDate,
      dailyCount,
      dailyLimit,
      remainingDaily,
      utilizationDaily,
      peakCount,
      peakLimit,
      remainingPeak,
      utilizationPeak
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}