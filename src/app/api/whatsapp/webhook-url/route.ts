import { NextRequest, NextResponse } from 'next/server';

/**
 * Get the webhook URL for WhatsApp Business API configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Get the actual host from request headers (works with tunnels/proxies)
    const host = request.headers.get('x-forwarded-host') || 
                 request.headers.get('host') || 
                 'localhost:3000';
    
    // Determine protocol - use https for non-localhost domains
    const proto = request.headers.get('x-forwarded-proto') || 
                  (host.includes('localhost') ? 'http' : 'https');
    
    // Construct the base URL from actual request
    const baseUrl = `${proto}://${host}`;
    const webhookUrl = `${baseUrl}/api/whatsapp/webhook`;

    console.log('Webhook URL generated:', { host, proto, webhookUrl });

    return NextResponse.json({
      webhookUrl,
      webhookPath: '/api/whatsapp/webhook',
      instructions: [
        'Copia esta URL del webhook (usa el botón "Copiar" o "Ver")',
        'Ve a Meta Developer Console > Tu App > WhatsApp > Configuration',
        'En la sección "Webhook", haz clic en "Edit"',
        'Pega la URL en el campo "Callback URL"',
        'Copia y pega tu "Webhook Verify Token" en el campo correspondiente',
        'Haz clic en "Verify and Save"',
        'Una vez verificado, haz clic en "Manage" y suscríbete al campo "messages"',
        'Guarda los cambios'
      ]
    });
  } catch (error) {
    console.error('Error generating webhook URL:', error);
    return NextResponse.json(
      { error: 'Failed to get webhook URL' },
      { status: 500 }
    );
  }
}