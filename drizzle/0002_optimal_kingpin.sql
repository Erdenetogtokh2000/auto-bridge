CREATE TABLE `quote_estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_request_id` text NOT NULL,
	`vehicle_name` text,
	`vehicle_price_krw` integer DEFAULT 0 NOT NULL,
	`purchase_fee_krw` integer DEFAULT 0 NOT NULL,
	`inland_transport_krw` integer DEFAULT 0 NOT NULL,
	`ocean_freight_usd` real DEFAULT 0 NOT NULL,
	`krw_mnt_rate` real DEFAULT 0 NOT NULL,
	`usd_mnt_rate` real DEFAULT 0 NOT NULL,
	`customs_mnt` integer DEFAULT 0 NOT NULL,
	`vat_mnt` integer DEFAULT 0 NOT NULL,
	`other_costs_mnt` integer DEFAULT 0 NOT NULL,
	`total_mnt` integer DEFAULT 0 NOT NULL,
	`deposit_mnt` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`quote_request_id`) REFERENCES `quote_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quote_estimates_quote_request_id_unique` ON `quote_estimates` (`quote_request_id`);