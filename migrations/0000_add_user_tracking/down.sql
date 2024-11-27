
-- Drop github_users table
DROP TABLE IF EXISTS github_users;

-- Create temporary table without last_reset
CREATE TABLE rate_limits_old (
  ip TEXT PRIMARY KEY,
  requests INTEGER DEFAULT 0
);

-- Copy essential data
INSERT INTO rate_limits_old (ip, requests)
SELECT ip, requests FROM rate_limits;

-- Drop new table
DROP TABLE rate_limits;

-- Rename old table
ALTER TABLE rate_limits_old RENAME TO rate_limits;