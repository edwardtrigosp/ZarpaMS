import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvData, overwrite = false } = body;

    // Validate csvData is present and is string
    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json(
        {
          error: 'csvData is required and must be a string',
          code: 'INVALID_CSV_DATA',
        },
        { status: 400 }
      );
    }

    // Parse CSV data
    const lines = csvData.split('\n').filter(line => line.trim() !== '');

    // Validate CSV has at least header row and one data row
    if (lines.length < 2) {
      return NextResponse.json(
        {
          error: 'CSV must contain at least a header row and one data row',
          code: 'INSUFFICIENT_CSV_DATA',
        },
        { status: 400 }
      );
    }

    // Extract header row
    const headerRow = lines[0].trim();
    const headers = headerRow.split(',').map(h => h.trim());

    // Validate headers
    const phoneNumberIndex = headers.findIndex(h => h.toLowerCase() === 'phonenumber');
    const nameIndex = headers.findIndex(h => h.toLowerCase() === 'name');

    if (phoneNumberIndex === -1) {
      return NextResponse.json(
        {
          error: 'CSV must contain "phoneNumber" column',
          code: 'MISSING_PHONE_NUMBER_COLUMN',
        },
        { status: 400 }
      );
    }

    // Parse data rows
    const parsedContacts: Array<{ phoneNumber: string; name: string | null }> = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());

      const phoneNumber = values[phoneNumberIndex] || '';
      const name = nameIndex !== -1 ? (values[nameIndex] || null) : null;

      // Validate phoneNumber format
      if (!phoneNumber) {
        errors.push(`Row ${i + 1}: Phone number is required`);
        continue;
      }

      if (!phoneNumber.startsWith('+')) {
        errors.push(`Row ${i + 1}: Phone number must start with + (${phoneNumber})`);
        continue;
      }

      parsedContacts.push({
        phoneNumber,
        name: name && name !== '' ? name : null,
      });
    }

    // Process contacts
    let imported = 0;
    let skipped = 0;

    for (const contact of parsedContacts) {
      try {
        if (overwrite) {
          // Check if contact exists
          const existing = await db
            .select()
            .from(contacts)
            .where(eq(contacts.phoneNumber, contact.phoneNumber))
            .limit(1);

          if (existing.length > 0) {
            // Update existing contact
            await db
              .update(contacts)
              .set({
                name: contact.name,
              })
              .where(eq(contacts.phoneNumber, contact.phoneNumber));
            imported++;
          } else {
            // Insert new contact
            await db.insert(contacts).values({
              phoneNumber: contact.phoneNumber,
              name: contact.name,
              createdAt: new Date().toISOString(),
            });
            imported++;
          }
        } else {
          // Try to insert, skip if duplicate
          try {
            await db.insert(contacts).values({
              phoneNumber: contact.phoneNumber,
              name: contact.name,
              createdAt: new Date().toISOString(),
            });
            imported++;
          } catch (error: any) {
            // Check if it's a unique constraint violation
            if (error.message && error.message.includes('UNIQUE')) {
              skipped++;
            } else {
              // Other database errors
              errors.push(
                `Error inserting ${contact.phoneNumber}: ${error.message}`
              );
            }
          }
        }
      } catch (error: any) {
        errors.push(
          `Error processing ${contact.phoneNumber}: ${error.message}`
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        imported,
        skipped,
        errors,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error.message,
      },
      { status: 500 }
    );
  }
}