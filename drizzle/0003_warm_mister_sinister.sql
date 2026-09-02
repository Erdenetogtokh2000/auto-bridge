ALTER TABLE `orders` ADD `quote_request_id` text REFERENCES quote_requests(id);--> statement-breakpoint
ALTER TABLE `orders` ADD `order_no` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_name` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `customer_phone` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `updated_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_quote_request_id_unique` ON `orders` (`quote_request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_no_unique` ON `orders` (`order_no`);--> statement-breakpoint
ALTER TABLE `quote_estimates` ADD `vehicle_make` text;--> statement-breakpoint
ALTER TABLE `quote_estimates` ADD `vehicle_model` text;--> statement-breakpoint
ALTER TABLE `quote_estimates` ADD `production_year` integer;--> statement-breakpoint
ALTER TABLE `quote_estimates` ADD `mileage_km` integer;--> statement-breakpoint
ALTER TABLE `quote_estimates` ADD `fuel_type` text;--> statement-breakpoint
ALTER TABLE `quote_requests` ADD `requester_email` text;