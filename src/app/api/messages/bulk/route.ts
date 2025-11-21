import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messageLogs, messageTemplates, contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

export async function POST(request: NextRequest) {
  try {
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

    // Validation: each contact must have phoneNumber
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
    const currentTime = new Date().toISOString();
    const createdMessages = [];

    // Process each contact
    for (const contactInput of contactsArray) {
      const { phoneNumber, name, variables } = contactInput;

      // Find or create contact
      let existingContact = await db.select()
        .from(contacts)
        .where(eq(contacts.phoneNumber, phoneNumber))
        .limit(1);

      let contactId: number;

      if (existingContact.length === 0) {
        // Create new contact
        const newContact = await db.insert(contacts)
          .values({
            phoneNumber,
            name: name || null,
            metadata: null,
            createdAt: currentTime
          })
          .returning();

        contactId = newContact[0].id;
      } else {
        contactId = existingContact[0].id;
        
        // Update contact name if provided and different
        if (name && existingContact[0].name !== name) {
          await db.update(contacts)
            .set({ name })
            .where(eq(contacts.id, contactId));
        }
      }

      // Replace variables in template content
      let messageContent = templateData.content;

      // Replace name variable
      if (name) {
        messageContent = messageContent.replace(/\{\{name\}\}/g, name);
      }

      // Replace custom variables
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          messageContent = messageContent.replace(regex, value);
        }
      }

      // Determine status and sentAt based on scheduledAt
      const status = scheduledAt ? 'QUEUED' : 'SENT';
      const sentAt = scheduledAt ? null : currentTime;

      // Create message log entry
      const messageLog = await db.insert(messageLogs)
        .values({
          templateId: parseInt(String(templateId)),
          contactId,
          phoneNumber,
          messageContent,
          status,
          metaMessageId: null,
          errorMessage: null,
          scheduledAt: scheduledAt || null,
          sentAt,
          deliveredAt: null,
          createdAt: currentTime
        })
        .returning();

      createdMessages.push(messageLog[0]);
    }

    return NextResponse.json(
      {
        success: true,
        messageCount: createdMessages.length,
        messages: createdMessages
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}