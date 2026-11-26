-- Sessions written for the site's own sign-in, in the shape the platform's
-- checks read: the cookie's value is stored as its SHA-256 hash.
CREATE TABLE IF NOT EXISTS shipsite_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_sub TEXT NOT NULL,
  user_email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS shipsite_sessions_token_hash ON shipsite_sessions (token_hash);
