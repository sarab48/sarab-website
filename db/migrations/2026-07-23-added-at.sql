-- 2026-07-23 — تاريخ الإضافة (docs/05 progress log). The owner was using booked_at
-- (تاريخ الحجز) to mean "when the client first reached us". Split the meanings:
--   added_at  = first contact — backfilled from the old booked_at (or created_at)
--   booked_at = the actual booking date — kept only on really-booked rows, and from
--               now on auto-set when a booking's status turns مؤكد/دفع العربون/مكتمل.
ALTER TABLE bookings ADD COLUMN added_at TEXT;
UPDATE bookings SET added_at = COALESCE(booked_at, substr(created_at, 1, 10));
UPDATE bookings SET booked_at = NULL WHERE status NOT IN ('مؤكد', 'دفع العربون', 'مكتمل');
