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
