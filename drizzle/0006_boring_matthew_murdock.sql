ALTER TABLE `shipment_events` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `shipment_events` ADD `created_at` text;--> statement-breakpoint
ALTER TABLE `shipments` ADD `destination` text DEFAULT 'Улаанбаатар' NOT NULL;--> statement-breakpoint
ALTER TABLE `shipments` ADD `transport_employee_email` text;--> statement-breakpoint
ALTER TABLE `shipments` ADD `updated_by` text;--> statement-breakpoint
ALTER TABLE `shipments` ADD `completed_at` text;