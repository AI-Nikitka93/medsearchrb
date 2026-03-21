CREATE INDEX IF NOT EXISTS idx_reviews_summary_doctor_captured_at
  ON reviews_summary(doctor_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_doctor_specialties_doctor_primary_specialty
  ON doctor_specialties(doctor_id, is_primary DESC, specialty_id);

CREATE INDEX IF NOT EXISTS idx_doctor_clinics_doctor_active_clinic
  ON doctor_clinics(doctor_id, is_active, clinic_id);

CREATE INDEX IF NOT EXISTS idx_promotions_clinic_active_hidden_doctor
  ON promotions(clinic_id, is_active, is_hidden, doctor_id);

CREATE INDEX IF NOT EXISTS idx_doctors_visibility_name
  ON doctors(is_hidden, opt_out, normalized_name);

CREATE INDEX IF NOT EXISTS idx_clinics_visibility_name
  ON clinics(is_hidden, opt_out, normalized_name);
