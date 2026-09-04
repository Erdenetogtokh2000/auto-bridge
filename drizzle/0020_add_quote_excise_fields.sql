ALTER TABLE quote_estimates ADD COLUMN IF NOT EXISTS engine_capacity_cc integer;
ALTER TABLE quote_estimates ADD COLUMN IF NOT EXISTS excise_mnt integer NOT NULL DEFAULT 0;
