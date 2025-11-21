import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { messageTemplates } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const templateId = parseInt(id);

    // Check if template exists
    const existingTemplate = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, templateId))
      .limit(1);

    if (existingTemplate.length === 0) {
      return NextResponse.json(
        {
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, content, variables, language, category, status, metaTemplateId } = body;

    // Validate category if provided
    const validCategories = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: 'Invalid category. Must be one of: MARKETING, UTILITY, AUTHENTICATION',
          code: 'INVALID_CATEGORY',
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: 'Invalid status. Must be one of: DRAFT, PENDING, APPROVED, REJECTED',
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (content !== undefined) {
      updateData.content = content.trim();
    }
    if (variables !== undefined) {
      updateData.variables = variables;
    }
    if (language !== undefined) {
      updateData.language = language.trim();
    }
    if (category !== undefined) {
      updateData.category = category;
    }
    if (status !== undefined) {
      updateData.status = status;
    }
    if (metaTemplateId !== undefined) {
      updateData.metaTemplateId = metaTemplateId ? metaTemplateId.trim() : metaTemplateId;
    }

    // Update template
    const updatedTemplate = await db
      .update(messageTemplates)
      .set(updateData)
      .where(eq(messageTemplates.id, templateId))
      .returning();

    if (updatedTemplate.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to update template',
          code: 'UPDATE_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTemplate[0], { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/templates/[id] error:', error);
    
    // Handle unique constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        {
          error: 'Template name already exists',
          code: 'DUPLICATE_NAME',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error: ' + error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const templateId = parseInt(id);

    // Check if template exists
    const existingTemplate = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, templateId))
      .limit(1);

    if (existingTemplate.length === 0) {
      return NextResponse.json(
        {
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Delete template
    const deleted = await db
      .delete(messageTemplates)
      .where(eq(messageTemplates.id, templateId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to delete template',
          code: 'DELETE_FAILED',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Template deleted successfully',
        deleted: deleted[0],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE /api/templates/[id] error:', error);
    
    // Handle foreign key constraint violation
    if (error.message && error.message.includes('FOREIGN KEY constraint failed')) {
      return NextResponse.json(
        {
          error: 'Cannot delete template: it is being used by message logs',
          code: 'FOREIGN_KEY_VIOLATION',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error: ' + error.message,
      },
      { status: 500 }
    );
  }
}