import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Add WhatsApp Business API platform tables
export const whatsappConfig = sqliteTable('whatsapp_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phoneNumberId: text('phone_number_id').notNull(),
  accessToken: text('access_token').notNull(),
  businessAccountId: text('business_account_id').notNull(),
  webhookVerifyToken: text('webhook_verify_token').notNull(),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  dailyLimit: integer('daily_limit').default(1000),
  peakLimit: integer('peak_limit').default(10000),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const messageTemplates = sqliteTable('message_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  content: text('content').notNull(),
  variables: text('variables', { mode: 'json' }),
  language: text('language').default('es'),
  category: text('category').notNull(),
  status: text('status').notNull(),
  metaTemplateId: text('meta_template_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phoneNumber: text('phone_number').notNull().unique(),
  name: text('name'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: text('created_at').notNull(),
});

export const messageLogs = sqliteTable('message_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  templateId: integer('template_id').references(() => messageTemplates.id),
  contactId: integer('contact_id').references(() => contacts.id),
  phoneNumber: text('phone_number').notNull(),
  messageContent: text('message_content').notNull(),
  status: text('status').notNull(),
  metaMessageId: text('meta_message_id'),
  errorMessage: text('error_message'),
  scheduledAt: text('scheduled_at'),
  sentAt: text('sent_at'),
  deliveredAt: text('delivered_at'),
  createdAt: text('created_at').notNull(),
});

export const rateLimitTracking = sqliteTable('rate_limit_tracking', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  dailyCount: integer('daily_count').default(0),
  peakCount: integer('peak_count').default(0),
  lastReset: text('last_reset').notNull(),
});