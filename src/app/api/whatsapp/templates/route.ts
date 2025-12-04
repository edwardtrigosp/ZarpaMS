import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppTemplateManager } from '@/lib/whatsapp-templates';
import { db } from '@/db';
import { messageTemplates } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST: Create new template in Meta and save to DB
export async function POST(req: NextRequest) {
  try {
    const { name, content, variables, language, category } = await req.json();

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WHATSAPP_WABA_ID;

    if (!accessToken || !wabaId) {
      return NextResponse.json(
        { error: 'Credenciales de WhatsApp no configuradas. Verifica WHATSAPP_ACCESS_TOKEN y WHATSAPP_WABA_ID en las variables de entorno.' },
        { status: 400 }
      );
    }

    // Validate template name (lowercase, alphanumeric, underscores only)
    const templateName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    if (!/^[a-z0-9_]+$/.test(templateName)) {
      return NextResponse.json(
        {
          error: 'El nombre de la plantilla solo puede contener letras minúsculas, números y guiones bajos',
        },
        { status: 400 }
      );
    }

    // Convert {{variable}} to {{1}}, {{2}}, etc. for Meta format
    let metaContent = content;
    const variableMatches = content.match(/\{\{(\w+)\}\}/g) || [];
    const variableMap: Record<string, number> = {};
    
    variableMatches.forEach((match: string, index: number) => {
      const varName = match.replace(/\{\{|\}\}/g, '');
      if (!variableMap[varName]) {
        variableMap[varName] = index + 1;
        metaContent = metaContent.replace(
          new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),
          `{{${variableMap[varName]}}}`
        );
      }
    });

    // Build components for Meta
    const components = [
      {
        type: 'BODY' as const,
        text: metaContent,
      }
    ];

    // Add example if variables exist
    if (Object.keys(variableMap).length > 0) {
      const exampleValues = Object.keys(variableMap).map((varName) => `ejemplo_${varName}`);
      components[0] = {
        ...components[0],
        example: {
          body_text: [exampleValues],
        },
      } as any;
    }

    const manager = new WhatsAppTemplateManager(accessToken, wabaId);

    // Create template in Meta
    const metaResult = await manager.createTemplate({
      name: templateName,
      language: language || 'es',
      category: category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
      components,
    });

    // Save to local database with Meta template ID
    const now = new Date().toISOString();
    const newTemplate = await db.insert(messageTemplates)
      .values({
        name: templateName,
        content,
        variables: variables || [],
        language: language || 'es',
        category,
        status: 'PENDING', // Always starts as PENDING in Meta
        metaTemplateId: metaResult.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({
      ...newTemplate[0],
      metaStatus: metaResult.status,
      message: 'Plantilla creada y enviada a Meta para aprobación'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating template in Meta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear plantilla en Meta' },
      { status: 500 }
    );
  }
}

// GET: List all templates from Meta or sync status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sync = searchParams.get('sync') === 'true';
    const templateId = searchParams.get('templateId');

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WHATSAPP_WABA_ID;

    if (!accessToken || !wabaId) {
      return NextResponse.json(
        { error: 'Credenciales de WhatsApp no configuradas' },
        { status: 400 }
      );
    }

    const manager = new WhatsAppTemplateManager(accessToken, wabaId);

    // Get specific template status
    if (templateId) {
      const template = await manager.getTemplateStatus(templateId);
      
      // Update local DB with latest status
      await db.update(messageTemplates)
        .set({ 
          status: template.status,
          updatedAt: new Date().toISOString()
        })
        .where(eq(messageTemplates.metaTemplateId, templateId));

      return NextResponse.json(template);
    }

    // Sync all templates from Meta
    if (sync) {
      const metaTemplates = await manager.listTemplates(100);
      
      // Update local DB with Meta statuses
      for (const metaTemplate of metaTemplates.data) {
        const localTemplate = await db.select()
          .from(messageTemplates)
          .where(eq(messageTemplates.metaTemplateId, metaTemplate.id))
          .limit(1);

        if (localTemplate.length > 0) {
          await db.update(messageTemplates)
            .set({ 
              status: metaTemplate.status,
              updatedAt: new Date().toISOString()
            })
            .where(eq(messageTemplates.id, localTemplate[0].id));
        }
      }

      return NextResponse.json({ 
        message: 'Plantillas sincronizadas exitosamente',
        count: metaTemplates.data.length 
      });
    }

    // List all templates from Meta
    const templates = await manager.listTemplates(100);
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates from Meta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener plantillas de Meta' },
      { status: 500 }
    );
  }
}
