import { NextResponse } from 'next/server';

/**
 * Get the webhook URL for WhatsApp Business API configuration
 */
export async function GET() {
  try {
    // Get the base URL from environment or construct it
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000';

    const webhookUrl = `${baseUrl}/api/whatsapp/webhook`;

    return NextResponse.json({
      webhookUrl,
      webhookPath: '/api/whatsapp/webhook',
      instructions: [
        'Copia esta URL del webhook',
        'Ve a Meta Developer Console > WhatsApp > Configuration',
        'Pega la URL en el campo "Callback URL"',
        'Ingresa tu Webhook Verify Token',
        'Haz clic en "Verify and Save"',
        'Suscríbete a los eventos: messages'
      ]
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get webhook URL' },
      { status: 500 }
    );
  }
}
