ALTER TABLE clinics
  ADD COLUMN site_health_status TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE clinics
  ADD COLUMN site_last_checked_at TEXT;

ALTER TABLE clinics
  ADD COLUMN site_last_http_status INTEGER;

ALTER TABLE clinics
  ADD COLUMN site_last_error TEXT;

ALTER TABLE clinics
  ADD COLUMN site_failure_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE clinics
  ADD COLUMN site_last_final_url TEXT;

CREATE INDEX IF NOT EXISTS idx_clinics_site_health_status
  ON clinics(site_health_status, site_last_checked_at DESC, site_failure_count DESC);

CREATE INDEX IF NOT EXISTS idx_clinics_site_url_health
  ON clinics(site_url, site_health_status, is_hidden, opt_out);
