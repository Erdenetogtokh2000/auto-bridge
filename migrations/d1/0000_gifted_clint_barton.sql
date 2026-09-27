CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`payment_id` text,
	`document_type` text NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text,
	`content_type` text,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`uploaded_by` text,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
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
	`video_url` text,
	`region` text DEFAULT 'ASIA' NOT NULL,
	`category` text,
	`description` text,
	`registration_deadline` text,
	`ticket_info` text,
	`participation_terms` text,
	`image_url` text,
	`image_object_key` text,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `financing_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`customer_email` text NOT NULL,
	`requested_amount_mnt` integer NOT NULL,
	`request_type` text DEFAULT 'VEHICLE_BALANCE' NOT NULL,
	`approved_amount_mnt` integer DEFAULT 0 NOT NULL,
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
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_type` text NOT NULL,
	`recipient_email` text,
	`order_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`href` text,
	`is_read` integer DEFAULT false NOT NULL,
	`read_at` text,
	`actor_email` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`quote_request_id` text,
	`order_no` text,
	`customer_name` text,
	`customer_phone` text,
	`customer_email` text NOT NULL,
	`status` text DEFAULT 'QUOTE' NOT NULL,
	`total_amount_mnt` integer DEFAULT 0 NOT NULL,
	`vehicle_subtotal_mnt` integer DEFAULT 0 NOT NULL,
	`deposit_amount_mnt` integer DEFAULT 0 NOT NULL,
	`balance_amount_mnt` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_request_id`) REFERENCES `quote_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_quote_request_id_unique` ON `orders` (`quote_request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_no_unique` ON `orders` (`order_no`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`payment_type` text NOT NULL,
	`currency` text NOT NULL,
	`amount` real NOT NULL,
	`amount_mnt` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`due_date` text,
	`reference_no` text,
	`note` text,
	`paid_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quote_estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_request_id` text NOT NULL,
	`vehicle_name` text,
	`vehicle_make` text,
	`vehicle_model` text,
	`production_year` integer,
	`mileage_km` integer,
	`fuel_type` text,
	`engine_capacity_cc` integer,
	`vehicle_price_krw` integer DEFAULT 0 NOT NULL,
	`purchase_fee_krw` integer DEFAULT 0 NOT NULL,
	`inland_transport_krw` integer DEFAULT 0 NOT NULL,
	`ocean_freight_usd` real DEFAULT 0 NOT NULL,
	`krw_mnt_rate` real DEFAULT 0 NOT NULL,
	`usd_mnt_rate` real DEFAULT 0 NOT NULL,
	`customs_mnt` integer DEFAULT 0 NOT NULL,
	`excise_mnt` integer DEFAULT 0 NOT NULL,
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
CREATE UNIQUE INDEX `quote_estimates_quote_request_id_unique` ON `quote_estimates` (`quote_request_id`);--> statement-breakpoint
CREATE TABLE `quote_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`source_url` text NOT NULL,
	`market` text DEFAULT 'KOREA' NOT NULL,
	`requester_name` text,
	`requester_phone` text,
	`requester_email` text,
	`status` text DEFAULT 'NEW' NOT NULL,
	`assigned_to` text,
	`updated_at` text,
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
	`created_by` text,
	`created_at` text,
	FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`container_no` text,
	`bill_of_lading_no` text,
	`origin_port` text,
	`destination` text DEFAULT 'Улаанбаатар' NOT NULL,
	`current_location` text,
	`status` text DEFAULT 'PREPARING' NOT NULL,
	`estimated_arrival` text,
	`transport_employee_email` text,
	`updated_by` text,
	`completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`company_name` text DEFAULT 'AUTO BRIDGE' NOT NULL,
	`support_email` text DEFAULT 'erdenetogtokh2000@gmail.com' NOT NULL,
	`contact_phone` text DEFAULT '7011-3322' NOT NULL,
	`office_hours` text DEFAULT 'Даваа–Баасан 09:00–18:00' NOT NULL,
	`krw_mnt_rate` real DEFAULT 2.55 NOT NULL,
	`usd_mnt_rate` real DEFAULT 3450 NOT NULL,
	`deposit_percent` integer DEFAULT 30 NOT NULL,
	`payment_reminder_days` integer DEFAULT 3 NOT NULL,
	`email_notifications` integer DEFAULT true NOT NULL,
	`transport_notifications` integer DEFAULT true NOT NULL,
	`document_notifications` integer DEFAULT true NOT NULL,
	`updated_by` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`phone` text,
	`role` text DEFAULT 'CUSTOMER' NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`permissions_customized` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`company_name` text,
	`company_registration_no` text,
	`financing_eligible` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_by` text,
	`last_login_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_email_unique` ON `user_profiles` (`email`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`stock_no` text NOT NULL,
	`source_market` text NOT NULL,
	`listing_url` text,
	`make` text NOT NULL,
	`model` text NOT NULL,
	`production_year` integer NOT NULL,
	`mileage_km` integer,
	`vin` text,
	`fuel_type` text,
	`trim` text,
	`color` text,
	`engine_capacity_cc` integer,
	`price_krw` integer,
	`price_amount` real,
	`price_currency` text DEFAULT 'KRW',
	`image_url` text,
	`image_object_key` text,
	`gallery_image_urls` text DEFAULT '[]' NOT NULL,
	`description` text,
	`is_published` integer DEFAULT false NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'AVAILABLE' NOT NULL,
	`created_by` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_stock_no_unique` ON `vehicles` (`stock_no`);--> statement-breakpoint
CREATE TABLE `user_login_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`result` text DEFAULT 'SUCCESS' NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`source` text DEFAULT 'WEB' NOT NULL,
	`logged_in_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
