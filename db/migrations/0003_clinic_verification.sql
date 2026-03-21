ALTER TABLE clinics
  ADD COLUMN booking_url_official TEXT;

ALTER TABLE clinics
  ADD COLUMN official_directory_url TEXT;

ALTER TABLE clinics
  ADD COLUMN official_booking_widget_url TEXT;

ALTER TABLE clinics
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'unverified';

ALTER TABLE clinics
  ADD COLUMN official_last_verified_at TEXT;

ALTER TABLE clinics
  ADD COLUMN official_verification_notes TEXT;

ALTER TABLE clinic_sources
  ADD COLUMN source_type TEXT NOT NULL DEFAULT 'aggregator';

ALTER TABLE clinic_sources
  ADD COLUMN is_official INTEGER NOT NULL DEFAULT 0;

ALTER TABLE clinic_sources
  ADD COLUMN source_priority INTEGER NOT NULL DEFAULT 100;

ALTER TABLE doctor_sources
  ADD COLUMN source_type TEXT NOT NULL DEFAULT 'aggregator';

ALTER TABLE doctor_sources
  ADD COLUMN profile_url TEXT;

ALTER TABLE doctor_sources
  ADD COLUMN official_profile_url TEXT;

ALTER TABLE doctor_sources
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'aggregator_only';

ALTER TABLE doctor_sources
  ADD COLUMN verified_on_clinic_site INTEGER NOT NULL DEFAULT 0;

ALTER TABLE doctor_sources
  ADD COLUMN last_verified_at TEXT;

ALTER TABLE doctor_sources
  ADD COLUMN confidence_score REAL NOT NULL DEFAULT 0.35;

ALTER TABLE doctor_clinics
  ADD COLUMN source_type TEXT NOT NULL DEFAULT 'aggregator';

ALTER TABLE doctor_clinics
  ADD COLUMN relation_source_url TEXT;

ALTER TABLE doctor_clinics
  ADD COLUMN official_profile_url TEXT;

ALTER TABLE doctor_clinics
  ADD COLUMN official_booking_url TEXT;

ALTER TABLE doctor_clinics
  ADD COLUMN aggregator_profile_url TEXT;

ALTER TABLE doctor_clinics
  ADD COLUMN aggregator_booking_url TEXT;

ALTER TABLE doctor_clinics
  ADD COLUMN verified_on_clinic_site INTEGER NOT NULL DEFAULT 0;

ALTER TABLE doctor_clinics
  ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'aggregator_only';

ALTER TABLE doctor_clinics
  ADD COLUMN last_verified_at TEXT;

ALTER TABLE doctor_clinics
  ADD COLUMN confidence_score REAL NOT NULL DEFAULT 0.35;

CREATE TABLE IF NOT EXISTS clinic_verification_runs (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT NOT NULL,
  checked_url TEXT NOT NULL,
  matched_doctors_count INTEGER NOT NULL DEFAULT 0,
  conflict_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clinics_verification_status
  ON clinics(verification_status, official_last_verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinic_sources_clinic_priority
  ON clinic_sources(clinic_id, is_official DESC, source_priority ASC, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_doctor_sources_doctor_verification
  ON doctor_sources(doctor_id, verification_status, last_verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_doctor_clinics_verification_status
  ON doctor_clinics(doctor_id, verification_status, verified_on_clinic_site DESC, last_verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_doctor_clinics_clinic_verification
  ON doctor_clinics(clinic_id, verification_status, verified_on_clinic_site DESC, last_verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_clinic_verification_runs_clinic_started
  ON clinic_verification_runs(clinic_id, started_at DESC);
