CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`phone` text,
	`role` text DEFAULT 'CUSTOMER' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`company_name` text,
	`company_registration_no` text,
	`notes` text,
	`created_by` text,
	`last_login_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_email_unique` ON `user_profiles` (`email`);