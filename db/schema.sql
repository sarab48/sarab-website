-- SARAB D1 schema v2 — bookings master (website + imported workbook) + operational tables.
-- 2026-07-03 migration (docs/05 progress log): master sheet الحجوزات → bookings; operational
-- sheets → their own tables; the owner's vocabularies (القوائم) → options; every raw row of
-- all 12 sheets → import_archive (lossless record, independent of any mapping decision).

CREATE TABLE IF NOT EXISTS bookings (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_no     TEXT UNIQUE,          -- رقم الحجز (SARAB-NNN); dashboard assigns for new ones
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  booked_at      TEXT,                 -- تاريخ الحجز
  event_date     TEXT,                 -- تاريخ المناسبة (YYYY-MM-DD)
  occasion       TEXT,                 -- نوع المناسبة
  first_name     TEXT,                 -- الاسم الأول
  last_name      TEXT,                 -- اسم العائلة
  name           TEXT,                 -- display name (form single field, or first+last)
  phone          TEXT,                 -- الجوال / واتساب (digits exactly as recorded)
  email          TEXT,
  city           TEXT,                 -- المدينة
  region         TEXT,                 -- المنطقة
  venue          TEXT,                 -- القاعة / المكان (the form's "event location" lands here)
  start_time     TEXT,                 -- وقت البداية
  end_time       TEXT,                 -- وقت النهاية
  hours          REAL,                 -- عدد الساعات
  guests         TEXT,                 -- عدد الضيوف (free-form in the workbook)
  package        TEXT,                 -- الباقة / النمط
  price          REAL,                 -- السعر الكامل
  deposit        REAL,                 -- العربون المدفوع
  remaining      REAL,                 -- المتبقي
  payment_status TEXT,                 -- حالة الدفع
  arrival_time   TEXT,                 -- وقت وصولي
  lead_source    TEXT,                 -- مصدر العميل
  interest       TEXT,                 -- مستوى اهتمام العميل
  callback       INTEGER DEFAULT 0,    -- إعادة الاتصال؟
  notes          TEXT,                 -- ملاحظات
  status         TEXT NOT NULL DEFAULT 'استفسار',  -- الحالة (owner vocabulary; site leads = استفسار)
  source         TEXT NOT NULL DEFAULT 'website',  -- website | import:<sheet>
  lang           TEXT,                 -- site language at submit
  extra          TEXT                  -- JSON: computed helpers + anything unmapped
);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- أسعار المدن
CREATE TABLE IF NOT EXISTS city_prices (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  city  TEXT NOT NULL,
  price REAL
);

-- الأرباح والمصاريف (per-event profit & expenses)
CREATE TABLE IF NOT EXISTS event_finances (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_no     TEXT,
  event_date     TEXT,
  city           TEXT,
  client         TEXT,
  price          REAL,   -- السعر الكامل
  paid           REAL,   -- المدفوع
  worker1        REAL,   -- عامل 1
  worker2        REAL,   -- عامل 2
  hours_cost     REAL,   -- ساعات
  transport      REAL,   -- مواصلات
  printing       REAL,   -- طباعة صور
  other          REAL,   -- أخرى
  tax_pct        REAL,   -- نسبة الضريبة
  tax_value      REAL,   -- قيمة الضريبة
  total_expenses REAL,   -- إجمالي المصاريف
  net_profit     REAL,   -- صافي الربح
  extra          TEXT
);

-- مصاريف عامة (general expense ledger)
CREATE TABLE IF NOT EXISTS general_expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT,
  category    TEXT,
  description TEXT,
  amount      REAL,
  method      TEXT,   -- طريقة الدفع
  notes       TEXT,
  extra       TEXT
);

-- المخزون
CREATE TABLE IF NOT EXISTS inventory (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  item        TEXT,
  unit        TEXT,
  qty_initial REAL,
  qty_added   REAL,
  qty_used    REAL,
  qty_left    REAL,
  alert_at    REAL,
  state       TEXT
);

-- القوائم (dropdown vocabularies + settings; `pos` keeps the owner's order)
CREATE TABLE IF NOT EXISTS options (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  kind  TEXT NOT NULL,  -- status | occasion | payment_status | lead_source | interest | expense_category | setting
  value TEXT NOT NULL,
  pos   INTEGER
);

-- Pricing tiers (2026-07-03, owner's design): cities are priced by distance/region
-- category — change the tier's price once and every city in it follows. Seeded from
-- the imported city_prices (kept untouched as the import record).
CREATE TABLE IF NOT EXISTS price_tiers (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  price REAL NOT NULL,
  pos   INTEGER
);
CREATE TABLE IF NOT EXISTS cities (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT NOT NULL UNIQUE,
  tier_id INTEGER NOT NULL REFERENCES price_tiers(id)
);

-- Anonymous usage analytics (2026-07-03): cookie-less beacon events from the public
-- site. No IPs, no persistent identifiers — `session` is a per-tab random id.
CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  type         TEXT NOT NULL,     -- view | scroll | wa | submit | time
  session      TEXT,
  lang         TEXT,
  country      TEXT,              -- coarse geo from the edge (request.cf)
  city         TEXT,
  ref          TEXT,              -- referrer hostname
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  fbclid       INTEGER DEFAULT 0, -- visit carried a Meta click id
  device       TEXT,              -- mobile | desktop
  value        REAL,              -- scroll depth % / seconds for `time`
  extra        TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ts   ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Lossless raw archive: every non-empty row of every workbook sheet, verbatim.
CREATE TABLE IF NOT EXISTS import_archive (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet   TEXT NOT NULL,
  row_idx INTEGER NOT NULL,  -- 1-based Excel row number
  cells   TEXT NOT NULL      -- JSON array of the row's displayed values
);
