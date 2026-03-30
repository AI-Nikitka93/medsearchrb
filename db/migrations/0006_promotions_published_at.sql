ALTER TABLE promotions
ADD COLUMN published_at TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_source_published_active
  ON promotions(source_name, published_at, is_active);
