ALTER TABLE `documents` ADD `content_type` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `size_bytes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `uploaded_by` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `verified_at` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `updated_at` text;