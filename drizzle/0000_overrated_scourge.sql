CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_number` text NOT NULL,
	`name` text,
	`metadata` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_phone_number_unique` ON `contacts` (`phone_number`);--> statement-breakpoint
CREATE TABLE `message_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer,
	`contact_id` integer,
	`phone_number` text NOT NULL,
	`message_content` text NOT NULL,
	`status` text NOT NULL,
	`meta_message_id` text,
	`error_message` text,
	`scheduled_at` text,
	`sent_at` text,
	`delivered_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `message_templates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `message_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`content` text NOT NULL,
	`variables` text,
	`language` text DEFAULT 'es',
	`category` text NOT NULL,
	`status` text NOT NULL,
	`meta_template_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_name_unique` ON `message_templates` (`name`);--> statement-breakpoint
CREATE TABLE `rate_limit_tracking` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`daily_count` integer DEFAULT 0,
	`peak_count` integer DEFAULT 0,
	`last_reset` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `whatsapp_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_number_id` text NOT NULL,
	`access_token` text NOT NULL,
	`business_account_id` text NOT NULL,
	`webhook_verify_token` text NOT NULL,
	`is_verified` integer DEFAULT false,
	`daily_limit` integer DEFAULT 1000,
	`peak_limit` integer DEFAULT 10000,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
