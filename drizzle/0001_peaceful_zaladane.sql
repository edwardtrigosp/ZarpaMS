CREATE TABLE `webhook_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`raw_payload` text NOT NULL,
	`message_id` text,
	`phone_number` text,
	`status` text,
	`processed` integer DEFAULT false,
	`error_message` text,
	`created_at` text NOT NULL
);
