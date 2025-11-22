import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messageTemplates } from '@/db/schema';
import { eq, like, and, or } from 'drizzle-orm';
import { validateApiKey, sanitizeString, validateTemplateContent, addSecurityHeaders, rateLimit, logSecurityEvent } from '@/lib/security';

const VALID_CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const;
const VALID_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as const;

// Rate limiter: 20 requests per minute
const rateLimiter = rateLimit({ windowMs: 60000, maxRequests: 20 });

export async function GET(request: NextRequest) {
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
      logSecurityEvent({
        type: 'AUTH_FAILURE',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/templates',
      });
      return NextResponse.json(
        { error: authCheck.error, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    let query = db.select().from(messageTemplates);

    const conditions = [];

    // ✅ SECURITY FIX: Sanitize search input to prevent SQL injection
    if (search) {
      const sanitizedSearch = sanitizeString(search);
      if (sanitizedSearch) {
        conditions.push(
          or(
            like(messageTemplates.name, `%${sanitizedSearch}%`),
            like(messageTemplates.content, `%${sanitizedSearch}%`)
          )
        );
      }
    }

    if (category) {
      conditions.push(eq(messageTemplates.category, category));
    }

    if (status) {
      conditions.push(eq(messageTemplates.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.limit(limit).offset(offset);

    const response = NextResponse.json(results, { status: 200 });
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

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
      logSecurityEvent({
        type: 'AUTH_FAILURE',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/templates',
      });
      return NextResponse.json(
        { error: authCheck.error, code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, content, variables, language, category, status, metaTemplateId } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { 
          error: 'Name is required',
          code: 'MISSING_NAME'
        },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { 
          error: 'Content is required',
          code: 'MISSING_CONTENT'
        },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { 
          error: 'Category is required',
          code: 'MISSING_CATEGORY'
        },
        { status: 400 }
      );
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category as any)) {
      return NextResponse.json(
        { 
          error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
          code: 'INVALID_CATEGORY'
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status as any)) {
      return NextResponse.json(
        { 
          error: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // ✅ SECURITY FIX: Sanitize inputs
    const trimmedName = sanitizeString(name.trim());
    const trimmedContent = content.trim();

    if (!trimmedName) {
      return NextResponse.json(
        { 
          error: 'Name cannot be empty',
          code: 'EMPTY_NAME'
        },
        { status: 400 }
      );
    }

    // ✅ SECURITY FIX: Validate template content
    const contentValidation = validateTemplateContent(trimmedContent);
    if (!contentValidation.valid) {
      logSecurityEvent({
        type: 'INVALID_INPUT',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        endpoint: '/api/templates',
        details: contentValidation.error,
      });
      return NextResponse.json(
        { 
          error: contentValidation.error,
          code: 'INVALID_CONTENT'
        },
        { status: 400 }
      );
    }

    // Prepare insert data with defaults
    const now = new Date().toISOString();
    const insertData = {
      name: trimmedName,
      content: trimmedContent,
      variables: variables ?? [],
      language: language ?? 'es',
      category,
      status: status ?? 'DRAFT',
      metaTemplateId: metaTemplateId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Insert template
    const newTemplate = await db.insert(messageTemplates)
      .values(insertData)
      .returning();

    const response = NextResponse.json(newTemplate[0], { status: 201 });
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('POST error:', error);

    // Handle unique constraint violation
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('UNIQUE constraint failed') || 
        errorMessage.includes('unique') ||
        errorMessage.toLowerCase().includes('name')) {
      return NextResponse.json(
        { 
          error: 'A template with this name already exists',
          code: 'DUPLICATE_NAME'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}