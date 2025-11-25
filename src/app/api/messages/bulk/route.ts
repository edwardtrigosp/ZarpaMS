import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messageLogs, messageTemplates, contacts, whatsappConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateApiKey, sanitizePhoneNumber, sanitizeString, addSecurityHeaders, rateLimit, logSecurityEvent } from '@/lib/security';

interface ContactInput {
  phoneNumber: string;
  name?: string;
  variables?: Record<string, string>;
}

interface BulkMessageRequest {
  templateId: number;
  contacts: ContactInput[];
  scheduledAt?: string;
}

// Rate limiter: 5 bulk sends per minute
const rateLimiter = rateLimit({ windowMs: 60000, maxRequests: 5 });

// ✅ Helper function to send WhatsApp message
async function sendWhatsAppMessage(
  phoneNumber: string,
  messageContent: string,
  templateName: string,
  templateLanguage: string,
  variables: Record<string, string> | undefined,
  config: any
) {
  try {
    const whatsappApiUrl = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;

    // Prepare template components for WhatsApp API
    const components: any[] = [];

    // If template has variables, add body component with parameters
    if (variables && Object.keys(variables).length > 0) {
      const parameters = Object.values(variables).map(value => ({
        type: "text",
        text: value
      }));

      components.push({
        type: "body",
        parameters
      });
    }

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: templateLanguage || "en_US"
        },
        components: components.length > 0 ? components : undefined
      }
    };

    console.log('📤 Sending WhatsApp message:', {
      to: phoneNumber,
      template: templateName,
      language: templateLanguage,
      hasVariables: !!variables
    });

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ WhatsApp API Error:', data);
      throw new Error(data.error?.message || 'Failed to send message');
    }

    console.log('✅ WhatsApp message sent:', data);

    return {
      success: true,
      metaMessageId: data.messages?.[0]?.id || null,
      data
    };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send message',
      metaMessageId: null
    };
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
        endpoint: '/api/messages/bulk',
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
        endpoint: '/api/messages/bulk',
      });
      return NextResponse.json(
        { error: authCheck.error, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body: BulkMessageRequest = await request.json();
    const { templateId, contacts: contactsArray, scheduledAt } = body;

    // Validation: templateId
    if (!templateId || isNaN(parseInt(String(templateId)))) {
      return NextResponse.json(
        { 
          error: 'Valid templateId is required',
          code: 'INVALID_TEMPLATE_ID'
        },
        { status: 400 }
      );
    }

    // Validation: contacts array
    if (!contactsArray || !Array.isArray(contactsArray) || contactsArray.length === 0) {
      return NextResponse.json(
        { 
          error: 'Contacts array is required and must contain at least one contact',
          code: 'INVALID_CONTACTS_ARRAY'
        },
        { status: 400 }
      );
    }

    // ✅ SECURITY FIX: Limit bulk send size to prevent abuse
    if (contactsArray.length > 1000) {
      logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/messages/bulk',
        details: `Attempted to send to ${contactsArray.length} contacts`,
      });
      return NextResponse.json(
        { 
          error: 'Maximum 1000 contacts per bulk send',
          code: 'TOO_MANY_CONTACTS'
        },
        { status: 400 }
      );
    }

    // ✅ SECURITY FIX: Validate each phone number
    for (let i = 0; i < contactsArray.length; i++) {
      if (!contactsArray[i].phoneNumber) {
        return NextResponse.json(
          { 
            error: `Contact at index ${i} is missing phoneNumber`,
            code: 'MISSING_PHONE_NUMBER'
          },
          { status: 400 }
        );
      }

      // Validate phone number format (E.164)
      const phoneValidation = sanitizePhoneNumber(contactsArray[i].phoneNumber);
      if (!phoneValidation.valid) {
        return NextResponse.json(
          { 
            error: `Contact at index ${i}: ${phoneValidation.error}`,
            code: 'INVALID_PHONE_NUMBER'
          },
          { status: 400 }
        );
      }

      // Update with sanitized phone number
      contactsArray[i].phoneNumber = phoneValidation.sanitized!;
    }

    // ✅ Fetch WhatsApp configuration
    const configData = await db.select()
      .from(whatsappConfig)
      .limit(1);

    if (configData.length === 0) {
      return NextResponse.json(
        { 
          error: 'WhatsApp configuration not found. Please configure WhatsApp in Dashboard first.',
          code: 'CONFIG_NOT_FOUND'
        },
        { status: 400 }
      );
    }

    const config = configData[0];

    if (!config.isVerified) {
      return NextResponse.json(
        { 
          error: 'WhatsApp configuration is not verified. Please verify in Dashboard first.',
          code: 'CONFIG_NOT_VERIFIED'
        },
        { status: 400 }
      );
    }

    // Fetch template
    const template = await db.select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, parseInt(String(templateId))))
      .limit(1);

    if (template.length === 0) {
      return NextResponse.json(
        { 
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const templateData = template[0];

    // ✅ Verify template is approved
    if (templateData.status !== 'APPROVED') {
      return NextResponse.json(
        { 
          error: `Template must be APPROVED by Meta. Current status: ${templateData.status}`,
          code: 'TEMPLATE_NOT_APPROVED'
        },
        { status: 400 }
      );
    }

    const currentTime = new Date().toISOString();
    const createdMessages = [];
    const sendResults = {
      successful: 0,
      failed: 0,
      queued: 0
    };

    // Process each contact
    for (const contactInput of contactsArray) {
      const { phoneNumber, name, variables } = contactInput;

      // ✅ SECURITY FIX: Sanitize name input
      const sanitizedName = name ? sanitizeString(name) : null;

      // Find or create contact
      let existingContact = await db.select()
        .from(contacts)
        .where(eq(contacts.phoneNumber, phoneNumber))
        .limit(1);

      let contactId: number;

      if (existingContact.length === 0) {
        const newContact = await db.insert(contacts)
          .values({
            phoneNumber,
            name: sanitizedName,
            metadata: null,
            createdAt: currentTime
          })
          .returning();

        contactId = newContact[0].id;
      } else {
        contactId = existingContact[0].id;
        
        if (sanitizedName && existingContact[0].name !== sanitizedName) {
          await db.update(contacts)
            .set({ name: sanitizedName })
            .where(eq(contacts.id, contactId));
        }
      }

      // Replace variables in template content for display
      let messageContent = templateData.content;

      if (sanitizedName) {
        messageContent = messageContent.replace(/\{\{name\}\}/g, sanitizedName);
      }

      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const sanitizedValue = sanitizeString(value);
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          messageContent = messageContent.replace(regex, sanitizedValue);
        }
      }

      // ✅ Send message immediately if not scheduled
      let status = 'QUEUED';
      let sentAt = null;
      let metaMessageId = null;
      let errorMessage = null;

      if (!scheduledAt) {
        // 🚀 SEND MESSAGE TO WHATSAPP NOW
        const sendResult = await sendWhatsAppMessage(
          phoneNumber,
          messageContent,
          templateData.name,
          templateData.language || "en_US",
          variables,
          config
        );

        if (sendResult.success) {
          status = 'SENT';
          sentAt = currentTime;
          metaMessageId = sendResult.metaMessageId;
          sendResults.successful++;
        } else {
          status = 'FAILED';
          errorMessage = sendResult.error;
          sendResults.failed++;
        }
      } else {
        sendResults.queued++;
      }

      // Create message log entry
      const messageLog = await db.insert(messageLogs)
        .values({
          templateId: parseInt(String(templateId)),
          contactId,
          phoneNumber,
          messageContent,
          status,
          metaMessageId,
          errorMessage,
          scheduledAt: scheduledAt || null,
          sentAt,
          deliveredAt: null,
          createdAt: currentTime
        })
        .returning();

      createdMessages.push(messageLog[0]);
    }

    console.log('📊 Bulk send results:', sendResults);

    const response = NextResponse.json(
      {
        success: true,
        messageCount: createdMessages.length,
        results: sendResults,
        messages: createdMessages
      },
      { status: 201 }
    );

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}