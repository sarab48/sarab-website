-- 2026-08-27 — two info-only fields on the per-event P&L row (owner request).
-- Neither joins total_expenses / net_profit — they are the owner's own records:
--   photos_taken : how many photos the booth TOOK at the event (not printed)
--   bank         : ₪ the owner moved to the bank from this event's money ("BANK")
ALTER TABLE event_finances ADD COLUMN photos_taken REAL;
ALTER TABLE event_finances ADD COLUMN bank REAL;
