-- Create migrations table
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create rate limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  requests INTEGER DEFAULT 0,
  last_reset DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create github users table
CREATE TABLE IF NOT EXISTS github_users (
  username TEXT PRIMARY KEY,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create visitors table with last_updated column
CREATE TABLE IF NOT EXISTS visitors (
  repo TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Record migration
INSERT INTO _migrations (name) VALUES ('0000_init');