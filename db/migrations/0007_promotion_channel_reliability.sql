ALTER TABLE notification_outbox
ADD COLUMN next_attempt_at TEXT;

ALTER TABLE notification_outbox
ADD COLUMN channel_chat_id TEXT;

ALTER TABLE notification_outbox
ADD COLUMN channel_message_id INTEGER;

ALTER TABLE notification_outbox
ADD COLUMN channel_last_checked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_outbox_retry_due
  ON notification_outbox(status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_channel_check
  ON notification_outbox(status, channel_last_checked_at, created_at);

-- Turn the existing monthly category record into its first concrete offer.
UPDATE promotions
SET title = 'Лазерная эпиляция — скидка 20%',
    description_short = 'Лазерная эпиляция -20% отдельные зоны',
    published_at = '2026-10-01',
    ends_at = '2026-10-31',
    fingerprint_hash = 'addbc7a2eda9f266e2aa6786442dab98dd5f59542b9e50dd388f8b5b1a173ce0'
WHERE source_name = 'eclinic'
  AND source_url LIKE '%/news/skidki-i-aktsii-mesyatsa%'
  AND title = 'Скидки и акции месяца';

-- Recover the existing channel post so the next refresh edits it in place.
UPDATE notification_outbox
SET channel_chat_id = '@medsearch_minsk',
    channel_message_id = 131
WHERE id = (
  SELECT o.id
  FROM notification_outbox o
  INNER JOIN promotions p ON p.id = o.entity_id
  WHERE o.event_type = 'promotion.updated'
    AND o.entity_type = 'promotion'
    AND o.status = 'sent'
    AND o.channel_message_id IS NULL
    AND p.source_name = 'eclinic'
    AND p.source_url LIKE '%/news/skidki-i-aktsii-mesyatsa%'
  ORDER BY o.sent_at DESC, o.created_at DESC
  LIMIT 1
);

-- Queue an in-place edit of the existing generic post after the migration runs.
INSERT INTO notification_outbox (
  id,
  event_type,
  entity_type,
  entity_id,
  dedupe_key,
  payload_json,
  status,
  attempt_count,
  created_at
)
SELECT
  'eclinic-first-offer-update-2026-10',
  'promotion.updated',
  'promotion',
  p.id,
  'eclinic-first-offer-update-2026-10',
  json_object(
    'title', p.title,
    'description', p.description_short,
    'source_url', p.source_url,
    'published_at', p.published_at
  ),
  'pending',
  0,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM promotions p
WHERE p.source_name = 'eclinic'
  AND p.source_url LIKE '%/news/skidki-i-aktsii-mesyatsa%'
  AND p.title = 'Лазерная эпиляция — скидка 20%'
  AND EXISTS (
    SELECT 1
    FROM notification_outbox o
    WHERE o.entity_id = p.id
      AND o.event_type = 'promotion.updated'
      AND o.entity_type = 'promotion'
      AND o.status = 'sent'
      AND o.channel_chat_id = '@medsearch_minsk'
      AND o.channel_message_id = 131
  )
  AND NOT EXISTS (
    SELECT 1
    FROM notification_outbox o
    WHERE o.dedupe_key = 'eclinic-first-offer-update-2026-10'
  );
