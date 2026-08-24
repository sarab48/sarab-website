-- 2026-08-24 — مدينة العميل (السكن). The owner writes the EVENT's city in `city`
-- (it drives pricing); clients often live somewhere else, and that fact was being
-- lost. New column starts empty everywhere — the owner fills it by hand per booking.
ALTER TABLE bookings ADD COLUMN client_city TEXT;
