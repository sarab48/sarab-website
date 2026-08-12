-- 2026-08-12 — من دفع فعلياً؟ (docs/05 progress log). Sometimes the person paying is
-- not the person the booking is on (a parent pays for the couple, a friend transfers),
-- and a bank transfer arrives with the payer's account details that must be kept for
-- matching the bank statement — and later for the Invoice4U receipt, which should name
-- the actual payer. Purely additive: two new nullable columns on payments, no existing
-- row or column touched. Empty payer = the booking's own client paid.
--   payer      = اسم الدافع (free text; only filled when it differs from the client)
--   method_ref = مرجع الدفع (bank account / transfer reference / check no. / last-4 …)
ALTER TABLE payments ADD COLUMN payer TEXT;
ALTER TABLE payments ADD COLUMN method_ref TEXT;
