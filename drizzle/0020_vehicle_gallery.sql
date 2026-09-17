ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "gallery_image_urls" text DEFAULT '[]' NOT NULL;
