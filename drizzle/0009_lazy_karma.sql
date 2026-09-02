ALTER TABLE `vehicles` ADD `trim` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `color` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `engine_capacity_cc` integer;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `price_amount` real;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `price_currency` text DEFAULT 'KRW';--> statement-breakpoint
ALTER TABLE `vehicles` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `image_object_key` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `description` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `is_published` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `is_featured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `vehicles` ADD `updated_at` text;