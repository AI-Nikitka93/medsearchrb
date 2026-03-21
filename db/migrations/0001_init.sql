CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  normalized_address TEXT,
  city TEXT NOT NULL DEFAULT 'Минск',
  district TEXT,
  metro_hint TEXT,
  address TEXT,
  site_url TEXT,
  phone TEXT,
  has_online_booking INTEGER NOT NULL DEFAULT 0 CHECK (has_online_booking IN (0, 1)),
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1)),
  opt_out INTEGER NOT NULL DEFAULT 0 CHECK (opt_out IN (0, 1)),
  suppression_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  gender_hint TEXT,
  description_short TEXT,
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1)),
  opt_out INTEGER NOT NULL DEFAULT 0 CHECK (opt_out IN (0, 1)),
  suppression_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS specialties (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL UNIQUE,
  synonyms_json TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS doctor_specialties (
  doctor_id TEXT NOT NULL,
  specialty_id TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  source_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  PRIMARY KEY (doctor_id, specialty_id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (specialty_id) REFERENCES specialties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctor_clinics (
  id TEXT PRIMARY KEY,
  relation_key TEXT NOT NULL UNIQUE,
  doctor_id TEXT NOT NULL,
  clinic_id TEXT NOT NULL,
  booking_url TEXT,
  profile_url TEXT,
  position_title TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clinic_sources (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  external_key TEXT NOT NULL,
  source_url TEXT NOT NULL,
  checksum TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  UNIQUE (source_name, external_key),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctor_sources (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL,
  clinic_id TEXT,
  source_name TEXT NOT NULL,
  external_key TEXT NOT NULL,
  source_url TEXT NOT NULL,
  booking_url TEXT,
  checksum TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  UNIQUE (source_name, external_key),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews_summary (
  id TEXT PRIMARY KEY,
  scope_key TEXT NOT NULL UNIQUE,
  doctor_id TEXT,
  clinic_id TEXT,
  doctor_clinic_id TEXT,
  source_name TEXT NOT NULL,
  source_page_url TEXT NOT NULL,
  rating_avg REAL,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  last_review_at TEXT,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_clinic_id) REFERENCES doctor_clinics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  doctor_id TEXT,
  title TEXT NOT NULL,
  description_short TEXT,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  discount_label TEXT,
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK (is_hidden IN (0, 1)),
  fingerprint_hash TEXT NOT NULL UNIQUE,
  last_seen_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS telegram_users (
  id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL UNIQUE,
  username TEXT,
  search_history_enabled INTEGER NOT NULL DEFAULT 0 CHECK (search_history_enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  filters_json TEXT,
  created_at TEXT NOT NULL,
  cleared_at TEXT,
  FOREIGN KEY (user_id) REFERENCES telegram_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  github_run_id TEXT,
  batch_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_clinics_normalized_name ON clinics(normalized_name);
CREATE INDEX IF NOT EXISTS idx_doctors_normalized_name ON doctors(normalized_name);
CREATE INDEX IF NOT EXISTS idx_doctor_specialties_specialty_id_doctor_id ON doctor_specialties(specialty_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_clinics_clinic_id_doctor_id ON doctor_clinics(clinic_id, doctor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_summary_doctor_source ON reviews_summary(doctor_id, source_name);
CREATE INDEX IF NOT EXISTS idx_promotions_clinic_active_ends_at ON promotions(clinic_id, is_active, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_fingerprint_hash ON promotions(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id_created_at ON search_history(user_id, created_at DESC);
