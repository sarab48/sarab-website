-- 2026-08-11 — سجل المدفوعات: one row per payment received, the foundation the
-- Invoice4U receipt automation will sit on (docs/05 progress log, owner-approved).
--
-- Purely additive: a new `payments` table, a payment_method vocabulary in `options`,
-- and backfill rows DERIVED from bookings. **No existing row in any table is modified.**
-- The doc_* columns stay empty until the receipt automation is switched on; they are
-- created now so issued documents can attach to payments without another migration.
-- Idempotent: every INSERT is guarded, so re-running (local then remote) is safe.

CREATE TABLE IF NOT EXISTS payments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id     INTEGER NOT NULL,     -- bookings.id (payments exist only for a booking)
  amount         REAL NOT NULL,        -- ₪ received
  kind           TEXT,                 -- عربون | دفعة (owner vocabulary)
  method         TEXT,                 -- طريقة الدفع (options kind=payment_method)
  paid_on        TEXT,                 -- date received (YYYY-MM-DD)
  note           TEXT,                 -- ملاحظات
  source         TEXT NOT NULL DEFAULT 'office',  -- office | backfill
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  -- Receipt document (Invoice4U), filled by the future automation:
  doc_type       TEXT,                 -- קבלה (עסק זעיר — receipt only, no tax invoice)
  doc_number     TEXT,                 -- legal sequential number from Invoice4U
  doc_url        TEXT,                 -- PDF link
  doc_status     TEXT,                 -- pending | issued | failed
  doc_error      TEXT,                 -- last error text, for the retry UI
  api_identifier TEXT,                 -- idempotency key sent to Invoice4U (sarab-pay-<id>)
  issued_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_on ON payments(paid_on);

-- طرق الدفع — owner-editable vocabulary, same pattern as the other dropdowns.
-- One guarded INSERT per value (D1 caps compound SELECT terms), idempotent per value.
INSERT INTO options (kind, value, pos) SELECT 'payment_method', 'نقداً', 1
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE kind = 'payment_method' AND value = 'نقداً');
INSERT INTO options (kind, value, pos) SELECT 'payment_method', 'تحويل بنكي', 2
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE kind = 'payment_method' AND value = 'تحويل بنكي');
INSERT INTO options (kind, value, pos) SELECT 'payment_method', 'Bit', 3
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE kind = 'payment_method' AND value = 'Bit');
INSERT INTO options (kind, value, pos) SELECT 'payment_method', 'بطاقة ائتمان', 4
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE kind = 'payment_method' AND value = 'بطاقة ائتمان');
INSERT INTO options (kind, value, pos) SELECT 'payment_method', 'شيك', 5
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE kind = 'payment_method' AND value = 'شيك');
INSERT INTO options (kind, value, pos) SELECT 'payment_method', 'PayBox', 6
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE kind = 'payment_method' AND value = 'PayBox');
INSERT INTO options (kind, value, pos) SELECT 'payment_method', 'أخرى', 7
  WHERE NOT EXISTS (SELECT 1 FROM options WHERE kind = 'payment_method' AND value = 'أخرى');

-- Backfill 1/2 — every recorded عربون becomes a ledger row, dated by the booking date
-- (when the client signed ≈ when the advance was paid; the true day was never recorded).
INSERT INTO payments (booking_id, amount, kind, method, paid_on, note, source)
SELECT b.id, b.deposit, 'عربون', NULL,
       substr(COALESCE(b.booked_at, b.created_at), 1, 10),
       'مُرحّل تلقائياً من حقل «العربون المدفوع» — التاريخ تقريبي',
       'backfill'
FROM bookings b
WHERE COALESCE(b.deposit, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM payments p
                  WHERE p.booking_id = b.id AND p.source = 'backfill' AND p.kind = 'عربون');

-- Backfill 2/2 — a completed event that collected more than its عربون: the difference
-- (price − remaining − deposit, the same «محصّل» rule the finance tab uses) becomes a
-- second row dated by the event. After both rows, Σ payments per booking equals exactly
-- what the dashboard already reports as collected — nothing changes on screen.
INSERT INTO payments (booking_id, amount, kind, method, paid_on, note, source)
SELECT b.id,
       b.price - COALESCE(b.remaining, 0) - COALESCE(b.deposit, 0),
       'دفعة', NULL,
       COALESCE(b.event_date, substr(b.created_at, 1, 10)),
       'مُرحّل تلقائياً — ما حُصّل حتى اكتمال المناسبة عدا العربون — التاريخ تقريبي',
       'backfill'
FROM bookings b
WHERE b.status = 'مكتمل'
  AND b.price IS NOT NULL
  AND b.price - COALESCE(b.remaining, 0) - COALESCE(b.deposit, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM payments p
                  WHERE p.booking_id = b.id AND p.source = 'backfill' AND p.kind = 'دفعة');
