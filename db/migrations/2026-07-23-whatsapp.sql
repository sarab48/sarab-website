-- 2026-07-23 — WhatsApp Cloud API ingestion (docs/05 progress log).
-- Every message that reaches /api/wa-webhook lands here verbatim; new contacts become
-- استفسار bookings automatically. Additive only — no existing table is touched.

CREATE TABLE IF NOT EXISTS wa_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  wamid       TEXT UNIQUE,        -- WhatsApp message id — dedupes webhook retries and history overlap
  ts          TEXT,               -- message time (ISO, from the webhook)
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  direction   TEXT NOT NULL,      -- in | out | log (unparsed payload kept verbatim)
  origin      TEXT,               -- live | history (coexistence 6-month back-sync)
  phone       TEXT,               -- customer number, international digits as WhatsApp sends them
  name        TEXT,               -- customer's WhatsApp profile name at that moment
  type        TEXT,               -- text | image | video | audio | document | … | raw
  body        TEXT,               -- text body / media caption
  referral    TEXT,               -- JSON: click-to-WhatsApp ad attribution (ctwa_clid, source_id, headline…)
  booking_id  INTEGER,            -- bookings row this contact was linked or auto-created to
  raw         TEXT                -- full original JSON when not plain text — nothing is ever dropped
);
CREATE INDEX IF NOT EXISTS idx_wa_phone ON wa_messages(phone);
CREATE INDEX IF NOT EXISTS idx_wa_ts    ON wa_messages(ts);

-- Address-book names from the coexistence contact sync (smb_app_state_sync) — history
-- messages carry no profile name, so this is where old chats get theirs.
CREATE TABLE IF NOT EXISTS wa_contacts (
  phone TEXT PRIMARY KEY,
  name  TEXT
);
