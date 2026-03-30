ALTER TABLE notification_outbox
ADD COLUMN claimed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_claimed_created
  ON notification_outbox(status, claimed_at, created_at);
