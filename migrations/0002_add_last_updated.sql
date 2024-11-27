-- Record this migration
INSERT INTO _migrations (name) VALUES ('0002_add_last_updated');

-- Create temporary table with desired schema
CREATE TABLE visitors_new (
  repo TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data with current timestamp
INSERT INTO visitors_new (repo, count, last_updated)
SELECT repo, count, CURRENT_TIMESTAMP
FROM visitors;

-- Drop old table
DROP TABLE visitors;

-- Rename new table to original name
ALTER TABLE visitors_new RENAME TO visitors;