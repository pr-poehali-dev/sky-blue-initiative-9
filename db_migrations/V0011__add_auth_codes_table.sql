CREATE TABLE IF NOT EXISTS t_p1532187_sky_blue_initiative_.auth_codes (
    username VARCHAR(255) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    chat_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);