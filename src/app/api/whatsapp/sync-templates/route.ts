import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappConfig, messageTemplates } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET - Sync templates from Meta WhatsApp Business API
 * Fetches all approved templates from Meta and updates local database
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Syncing templates from Meta...');

    // Get WhatsApp config
    const configs = await db.select().from(whatsappConfig).limit(1);
    
    if (configs.length === 0) {
      return NextResponse.json(
        { error: 'WhatsApp configuration not found' },
        { status: 404 }
      );
    }

    const config = configs[0];

    // Fetch templates from Meta
    const templatesUrl = `https://graph.facebook.com/v21.0/${config.businessAccountId}/message_templates`;
    
    console.log('📡 Fetching templates from Meta...');
    const response = await fetch(templatesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to fetch templates:', error);
      return NextResponse.json({
        success: false,
        error: error.error?.message || 'Failed to fetch templates from Meta'
      }, { status: 400 });
    }

    const data = await response.json();
    const metaTemplates = data.data || [];

    console.log(`📥 Found ${metaTemplates.length} templates in Meta`);

    const syncResults = {
      total: metaTemplates.length,
      approved: 0,
      synced: 0,
      templates: [] as any[]
    };

    // Process each template
    for (const metaTemplate of metaTemplates) {
      const templateInfo: any = {
        name: metaTemplate.name,
        status: metaTemplate.status,
        language: metaTemplate.language,
        category: metaTemplate.category
      };

      // Only sync APPROVED templates
      if (metaTemplate.status !== 'APPROVED') {
        console.log(`⏭️  Skipping ${metaTemplate.name} - Status: ${metaTemplate.status}`);
        templateInfo.synced = false;
        templateInfo.reason = 'Not approved';
        syncResults.templates.push(templateInfo);
        continue;
      }

      syncResults.approved++;

      // Extract template content and variables
      const bodyComponent = metaTemplate.components?.find((c: any) => c.type === 'BODY');
      const content = bodyComponent?.text || '';
      
      // Extract variables from {{1}}, {{2}}, etc.
      const variableMatches = content.match(/\{\{(\d+)\}\}/g) || [];
      const variables = variableMatches.map((match: string, index: number) => `var${index + 1}`);

      try {
        // Check if template exists in database
        const existingTemplates = await db
          .select()
          .from(messageTemplates)
          .where(eq(messageTemplates.name, metaTemplate.name))
          .limit(1);

        const templateData = {
          name: metaTemplate.name,
          content: content,
          variables: JSON.stringify(variables),
          language: metaTemplate.language,
          category: metaTemplate.category,
          status: metaTemplate.status,
          metaTemplateId: metaTemplate.id,
          updatedAt: new Date().toISOString(),
        };

        if (existingTemplates.length > 0) {
          // Update existing template
          await db
            .update(messageTemplates)
            .set(templateData)
            .where(eq(messageTemplates.id, existingTemplates[0].id));
          
          console.log(`✅ Updated: ${metaTemplate.name}`);
          templateInfo.synced = true;
          templateInfo.action = 'updated';
        } else {
          // Insert new template
          await db.insert(messageTemplates).values({
            ...templateData,
            createdAt: new Date().toISOString(),
          });
          
          console.log(`✅ Created: ${metaTemplate.name}`);
          templateInfo.synced = true;
          templateInfo.action = 'created';
        }

        syncResults.synced++;
        templateInfo.content = content;
        templateInfo.variables = variables;
      } catch (error) {
        console.error(`❌ Failed to sync ${metaTemplate.name}:`, error);
        templateInfo.synced = false;
        templateInfo.error = error instanceof Error ? error.message : 'Unknown error';
      }

      syncResults.templates.push(templateInfo);
    }

    console.log(`✅ Sync completed: ${syncResults.synced}/${syncResults.approved} approved templates synced`);

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResults.synced} of ${syncResults.approved} approved templates`,
      results: syncResults
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error syncing templates:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
