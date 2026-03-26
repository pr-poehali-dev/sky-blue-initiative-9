
ALTER TABLE t_p1532187_sky_blue_initiative_.products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE t_p1532187_sky_blue_initiative_.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE t_p1532187_sky_blue_initiative_.products ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
