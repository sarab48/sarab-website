-- 2026-07-26 — طاقم المناسبة (docs/05 progress log). Each booking now records who is
-- working the event and how many workers are going. Purely additive: two new nullable
-- columns on bookings, no existing row or column touched.
--   staff       = اسم العامل / أسماء العمال (free text, comma-separated for more than one)
--   staff_count = عدد العمال (auto-derived from the names in the office drawer, editable)
ALTER TABLE bookings ADD COLUMN staff TEXT;
ALTER TABLE bookings ADD COLUMN staff_count INTEGER;
