import axios, { AxiosInstance } from 'axios';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: TemplateButton[];
  example?: {
    header_text?: string[][];
    body_text?: string[][];
    footer_text?: string[][];
  };
}

interface TemplateButton {
  type: 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY' | 'OTP' | 'COPY_CODE';
  text: string;
  phone_number?: string;
  url?: string;
  example?: string[];
}

interface CreateTemplateRequest {
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  components: TemplateComponent[];
}

interface TemplateStatusResponse {
  id: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED' | 'PAUSED';
  category: string;
  language: string;
  quality_score?: string;
  rejection_reason?: string;
  components?: TemplateComponent[];
  created_at?: string;
}

interface ListTemplatesResponse {
  data: TemplateStatusResponse[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}

class WhatsAppTemplateManager {
  private client: AxiosInstance;
  private wabaId: string;
  private apiVersion = 'v24.0';

  constructor(accessToken: string, wabaId: string, apiVersion = 'v24.0') {
    this.wabaId = wabaId;
    this.apiVersion = apiVersion;
    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${apiVersion}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a new message template in Meta
   */
  async createTemplate(
    template: CreateTemplateRequest
  ): Promise<{ id: string; status: string }> {
    try {
      const response = await this.client.post(
        `/${this.wabaId}/message_templates`,
        template
      );
      return {
        id: response.data.id,
        status: response.data.status || 'PENDING',
      };
    } catch (error: any) {
      throw new Error(
        `Failed to create template: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Get template status and details from Meta
   */
  async getTemplateStatus(templateId: string): Promise<TemplateStatusResponse> {
    try {
      const response = await this.client.get(
        `/${templateId}?fields=id,name,status,category,language,quality_score,rejection_reason,components,created_at`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to fetch template: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * List all templates from Meta
   */
  async listTemplates(
    limit = 100,
    after?: string
  ): Promise<ListTemplatesResponse> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        fields:
          'id,name,status,category,language,quality_score,rejection_reason,created_at',
      });

      if (after) params.append('after', after);

      const response = await this.client.get(
        `/${this.wabaId}/message_templates?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to list templates: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Get template by name from Meta
   */
  async getTemplateByName(name: string): Promise<TemplateStatusResponse | null> {
    try {
      const templates = await this.listTemplates(100);
      return (
        templates.data.find(
          (t) => t.name.toLowerCase() === name.toLowerCase()
        ) || null
      );
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a template from Meta
   */
  async deleteTemplate(
    templateName: string,
    hsm_id?: string
  ): Promise<{ success: boolean }> {
    try {
      const params = new URLSearchParams({ name: templateName });
      if (hsm_id) params.append('hsm_id', hsm_id);
      
      await this.client.delete(
        `/${this.wabaId}/message_templates?${params.toString()}`
      );
      return { success: true };
    } catch (error: any) {
      throw new Error(
        `Failed to delete template: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }
}

export { WhatsAppTemplateManager, CreateTemplateRequest, TemplateStatusResponse };
