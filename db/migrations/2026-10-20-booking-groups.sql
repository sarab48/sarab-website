-- 2026-10-20 — مناسبات العميل (owner request): one client, several dates — a bride-only
-- night and the wedding itself, often in different halls or cities. Each date stays a full
-- booking of its own (its own city pricing, hours, staff, price, payments, P&L row and
-- calendar entry — every part of the office is built per event); what was missing was the
-- link between them. `group_id` is that link: every booking of the same client carries the
-- id of the booking the group was started from (NULL = a booking on its own). It is a
-- shared token, not a foreign key — it stays valid even if that first row is later deleted.
-- Purely additive: existing rows keep NULL and nothing else changes.
ALTER TABLE bookings ADD COLUMN group_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_bookings_group ON bookings(group_id);
