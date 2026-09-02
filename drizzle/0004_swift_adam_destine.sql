ALTER TABLE `payments` ADD `amount_mnt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` ADD `reference_no` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `note` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `updated_at` text;