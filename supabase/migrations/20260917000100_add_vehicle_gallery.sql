alter table public.vehicles
  add column if not exists gallery_image_urls text not null default '[]';
