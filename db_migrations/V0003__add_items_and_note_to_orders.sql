ALTER TABLE t_p1532187_sky_blue_initiative_.orders
  ADD COLUMN IF NOT EXISTS items jsonb NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS note text NULL;