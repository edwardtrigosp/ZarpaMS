import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messageLogs } from '@/db/schema';
import { eq, like, and, or, gte, lte, desc, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Filter parameters
    const status = searchParams.get('status');
    const phoneNumber = searchParams.get('phoneNumber');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const templateId = searchParams.get('templateId');
    const search = searchParams.get('search');

    // Build where conditions
    const conditions = [];

    // Status filter
    if (status) {
      conditions.push(eq(messageLogs.status, status));
    }

    // Phone number filter (exact match)
    if (phoneNumber) {
      conditions.push(eq(messageLogs.phoneNumber, phoneNumber));
    }

    // Start date filter
    if (startDate) {
      conditions.push(gte(messageLogs.createdAt, startDate));
    }

    // End date filter
    if (endDate) {
      conditions.push(lte(messageLogs.createdAt, endDate));
    }

    // Template ID filter
    if (templateId) {
      const templateIdInt = parseInt(templateId);
      if (!isNaN(templateIdInt)) {
        conditions.push(eq(messageLogs.templateId, templateIdInt));
      }
    }

    // Search filter (phoneNumber and messageContent)
    if (search) {
      conditions.push(
        or(
          like(messageLogs.phoneNumber, `%${search}%`),
          like(messageLogs.messageContent, `%${search}%`)
        )
      );
    }

    // Build base query
    let whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalCountQuery = whereClause
      ? db.select({ count: count() }).from(messageLogs).where(whereClause)
      : db.select({ count: count() }).from(messageLogs);

    const totalResult = await totalCountQuery;
    const total = totalResult[0]?.count ?? 0;

    // Get paginated results
    let query = db.select().from(messageLogs);

    if (whereClause) {
      query = query.where(whereClause);
    }

    const messages = await query
      .orderBy(desc(messageLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(
      {
        messages,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}