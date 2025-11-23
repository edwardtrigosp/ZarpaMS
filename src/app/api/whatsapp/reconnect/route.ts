import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST - Verify WhatsApp connection and update status
 * Tests the credentials and marks as connected if valid
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Verifying WhatsApp connection...');

    // Get current config
    const configs = await db.select().from(whatsappConfig).limit(1);
    
    if (configs.length === 0) {
      return NextResponse.json(
        { error: 'WhatsApp configuration not found' },
        { status: 404 }
      );
    }

    const config = configs[0];

    // Test the connection by making a simple API call to WhatsApp
    const testUrl = `https://graph.facebook.com/v21.0/${config.phoneNumberId}`;
    
    console.log('📡 Testing WhatsApp API connection...');
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    const data = await response.json();
    console.log('📥 WhatsApp API Response:', data);

    if (!response.ok) {
      console.error('❌ Connection failed:', data);
      
      // Update as disconnected
      await db
        .update(whatsappConfig)
        .set({ 
          isVerified: false,
          updatedAt: new Date().toISOString()
        })
        .where(eq(whatsappConfig.id, config.id));

      return NextResponse.json({
        success: false,
        error: data.error?.message || 'Failed to connect to WhatsApp API',
        details: data
      }, { status: 400 });
    }

    // Connection successful - update status
    console.log('✅ WhatsApp connection verified successfully');
    
    await db
      .update(whatsappConfig)
      .set({ 
        isVerified: true,
        updatedAt: new Date().toISOString()
      })
      .where(eq(whatsappConfig.id, config.id));

    return NextResponse.json({
      success: true,
      message: 'WhatsApp connected successfully',
      data: {
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId,
        verified: true
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error verifying connection:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}