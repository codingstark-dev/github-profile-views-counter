
-- Add migrations record
INSERT INTO _migrations (name) VALUES ('0001_add_user_tracking');

-- Update rate_limits table
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS last_reset DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create github_users table
CREATE TABLE IF NOT EXISTS github_users (
  username TEXT PRIMARY KEY,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create temporary table for rate_limits
CREATE TABLE IF NOT EXISTS rate_limits_new (
  ip TEXT PRIMARY KEY,
  requests INTEGER DEFAULT 0,
  last_reset DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table
INSERT INTO rate_limits_new (ip, requests)
SELECT ip, requests FROM rate_limits;

-- Drop old table
DROP TABLE rate_limits;

-- Rename new table
ALTER TABLE rate_limits_new RENAME TO rate_limits;