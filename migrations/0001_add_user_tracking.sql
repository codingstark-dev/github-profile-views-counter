
-- Record this migration
INSERT INTO _migrations (name) VALUES ('0001_add_user_tracking');

-- Create initial tables if they don't exist
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  requests INTEGER DEFAULT 0,
  last_reset DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS github_users (
  username TEXT PRIMARY KEY,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visitors (
  repo TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);