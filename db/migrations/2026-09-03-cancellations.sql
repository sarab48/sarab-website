-- 2026-09-03 — cancellations after an advance was paid (owner request).
-- A booking that cancels keeps the ملغي status; these three columns hold the
-- cancellation record so the office can find such clients and decide, per booking,
-- whether the advance goes back to the client or stays. The refund itself is a
-- payments-ledger row (kind استرداد, negative amount) — see functions/office/api/payments.js.
ALTER TABLE bookings ADD COLUMN cancelled_at    TEXT;  -- تاريخ الإلغاء (auto-stamped on reaching ملغي)
ALTER TABLE bookings ADD COLUMN cancel_decision TEXT;  -- kept | refund | NULL (undecided)
ALTER TABLE bookings ADD COLUMN cancel_reason   TEXT;  -- سبب الإلغاء (free text)
