CREATE TABLE `financing_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`customer_email` text NOT NULL,
	`requested_amount_mnt` integer NOT NULL,
	`term_months` integer DEFAULT 12 NOT NULL,
	`purpose` text,
	`status` text DEFAULT 'NEW' NOT NULL,
	`decision_note` text,
	`decided_by` text,
	`decided_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
