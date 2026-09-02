ALTER TABLE `financing_requests` ADD `request_type` text DEFAULT 'VEHICLE_BALANCE' NOT NULL;--> statement-breakpoint
ALTER TABLE `financing_requests` ADD `approved_amount_mnt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `financing_eligible` integer DEFAULT false NOT NULL;