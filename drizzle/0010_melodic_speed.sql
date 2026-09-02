ALTER TABLE `expos` ADD `video_url` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `region` text DEFAULT 'ASIA' NOT NULL;--> statement-breakpoint
ALTER TABLE `expos` ADD `category` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `description` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `registration_deadline` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `ticket_info` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `participation_terms` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `image_url` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `image_object_key` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `is_published` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `expos` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `created_at` text;--> statement-breakpoint
ALTER TABLE `expos` ADD `updated_at` text;--> statement-breakpoint
INSERT OR IGNORE INTO `expos` (`id`,`title`,`country`,`city`,`venue`,`start_date`,`end_date`,`official_url`,`region`,`category`,`description`,`is_featured`,`is_published`,`created_by`,`created_at`,`updated_at`) VALUES
('EXP-JMS-BIZWEEK-2026','Japan Mobility Show Bizweek 2026','Japan','Chiba','Makuhari Messe','2026-10-13','2026-10-16','https://www.japan-mobility-show.com/en/','ASIA','Mobility · Technology · B2B','Mobility, технологи болон автомашины салбарын олон улсын B2B үзэсгэлэн.',true,true,'SYSTEM_SEED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('EXP-IAA-MOBILITY-2027','IAA MOBILITY 2027','Germany','Munich','Messe München','2027-09-07','2027-09-12','https://www.iaa-mobility.com/en','EUROPE','Mobility · EV · Technology','Цахилгаан автомашин, шинэ хөдөлгөөнт технологи болон олон улсын автомашины салбарын үзэсгэлэн.',false,true,'SYSTEM_SEED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
