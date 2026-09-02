CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`document_type` text NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `expos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`country` text NOT NULL,
	`city` text NOT NULL,
	`venue` text,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`official_url` text,
	`is_featured` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`customer_email` text NOT NULL,
	`status` text DEFAULT 'QUOTE' NOT NULL,
	`total_amount_mnt` integer DEFAULT 0 NOT NULL,
	`deposit_amount_mnt` integer DEFAULT 0 NOT NULL,
	`balance_amount_mnt` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`payment_type` text NOT NULL,
	`currency` text NOT NULL,
	`amount` real NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`paid_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quote_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`source_url` text NOT NULL,
	`market` text DEFAULT 'KOREA' NOT NULL,
	`requester_name` text,
	`requester_phone` text,
	`status` text DEFAULT 'NEW' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shipment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`shipment_id` text NOT NULL,
	`event_code` text NOT NULL,
	`location` text,
	`note` text,
	`event_at` text NOT NULL,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`container_no` text,
	`bill_of_lading_no` text,
	`origin_port` text,
	`current_location` text,
	`status` text DEFAULT 'PREPARING' NOT NULL,
	`estimated_arrival` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`stock_no` text NOT NULL,
	`source_market` text NOT NULL,
	`listing_url` text,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`production_year` integer NOT NULL,
	`mileage_km` integer,
	`fuel_type` text,
	`price_krw` integer,
	`status` text DEFAULT 'AVAILABLE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_stock_no_unique` ON `vehicles` (`stock_no`);