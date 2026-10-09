export const up = (): string => {
  return `
    CREATE TABLE request_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_uid TEXT NOT NULL,
      collection_name TEXT NOT NULL DEFAULT '',
      item_pathname TEXT,
      request_name TEXT NOT NULL DEFAULT '',
      method TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      status INTEGER,
      status_text TEXT,
      error TEXT,
      duration_ms INTEGER,
      size_bytes INTEGER,
      sent_at INTEGER NOT NULL,
      request_file_id INTEGER REFERENCES files(id),
      response_file_id INTEGER REFERENCES files(id),
      body_file_id INTEGER REFERENCES files(id)
    );
    CREATE INDEX idx_request_history_sent_at ON request_history (sent_at DESC, id DESC);
  `;
};

export const down = (): string => {
  return `
    DROP INDEX IF EXISTS idx_request_history_sent_at;
    DROP TABLE IF EXISTS request_history;
  `;
};
