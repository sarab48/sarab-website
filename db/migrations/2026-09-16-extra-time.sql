-- 2026-09-16 — الوقت الإضافي (owner request): clients ask the booth to stay longer and
-- pay for it on the spot (SARAB-064: one more hour, 200 ₪). The charge is a change to
-- the deal, so it lives on the booking beside the agreed price — never folded into it:
--   extra_hours  : hours actually worked beyond the booked ones (0.5 allowed)
--   extra_amount : ₪ charged for that time (the money itself is a ledger payment)
--   extra_note   : what the extra was, if the owner wants to say
-- Total = price + COALESCE(extra_amount, 0) — every place that summed `price`
-- (revenue, expected by year/month, collected, advances, overdue) now sums the total.
ALTER TABLE bookings ADD COLUMN extra_hours  REAL;
ALTER TABLE bookings ADD COLUMN extra_amount REAL;
ALTER TABLE bookings ADD COLUMN extra_note   TEXT;

-- The P&L «ساعات» box (event_finances.hours_cost) has always been used as the number of
-- hours worked (2 / 3 / 4 in every row) yet was summed as a ₪2–4 expense. It becomes an
-- info-only field like photos_taken / bank; stored totals are recomputed without it.
UPDATE event_finances SET
  total_expenses = COALESCE(worker1, 0) + COALESCE(worker2, 0) + COALESCE(transport, 0)
                 + COALESCE(printing, 0) + COALESCE(other, 0) + COALESCE(tax_value, 0),
  net_profit     = COALESCE(paid, 0)
                 - (COALESCE(worker1, 0) + COALESCE(worker2, 0) + COALESCE(transport, 0)
                    + COALESCE(printing, 0) + COALESCE(other, 0) + COALESCE(tax_value, 0));
