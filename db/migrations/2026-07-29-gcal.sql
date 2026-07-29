-- 2026-07-29 — Google Calendar sync for real bookings.
-- Purely additive: three new nullable columns on `bookings`, nothing read, changed or
-- dropped. `gcal_event_id` is the link back to the event this booking owns in the
-- owner's Google Calendar; `gcal_link` is that event's htmlLink (so the dashboard can
-- open it); `gcal_synced_at` is when we last pushed it.
ALTER TABLE bookings ADD COLUMN gcal_event_id  TEXT;
ALTER TABLE bookings ADD COLUMN gcal_link      TEXT;
ALTER TABLE bookings ADD COLUMN gcal_synced_at TEXT;
