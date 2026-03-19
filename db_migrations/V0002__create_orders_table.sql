CREATE TABLE IF NOT EXISTS t_p1532187_sky_blue_initiative_.orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p1532187_sky_blue_initiative_.users(id),
  status VARCHAR(50) DEFAULT 'new',
  total INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
