-- Minimal seed data for production
-- Roles table: only admin role
INSERT INTO roles (id, name, description, permissions) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'admin', 'Full system access', '{"all": true}')
ON CONFLICT (name) DO NOTHING;

-- Users table: only admin user (email: admin@callcrm.com, password hash for "Admin@123")
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, is_active) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'admin@callcrm.com', '$2a$10$JYfAiU1FSBHFWc9or9JFbuQAwyUfMJ7gnde4ebSyketeFXO7evjp6', 'Rajesh', 'Sharma', '+91-9876543210', 'a1000000-0000-0000-0000-000000000001', TRUE)
ON CONFLICT (email) DO NOTHING;

-- No other data (businesses, calls, etc.) seeded for production
