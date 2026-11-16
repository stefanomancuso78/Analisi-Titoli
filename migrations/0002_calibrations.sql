CREATE TABLE calibrations (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE, payload TEXT NOT NULL);
