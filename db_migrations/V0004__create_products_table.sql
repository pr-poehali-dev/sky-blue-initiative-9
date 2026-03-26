
CREATE TABLE IF NOT EXISTS t_p1532187_sky_blue_initiative_.products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100),
  icon VARCHAR(50) DEFAULT 'Package',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);
