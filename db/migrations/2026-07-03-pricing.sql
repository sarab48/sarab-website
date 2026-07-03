-- One-time: seed price tiers from the imported city_prices (one tier per distinct
-- price, ascending) and assign every city to its tier. Idempotent via NOT EXISTS.
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

INSERT INTO price_tiers (name, price, pos)
SELECT 'فئة ' || CAST(CAST(d.price AS INTEGER) AS TEXT) || ' ₪',
       d.price,
       ROW_NUMBER() OVER (ORDER BY d.price)
FROM (SELECT DISTINCT price FROM city_prices WHERE price IS NOT NULL) d
WHERE NOT EXISTS (SELECT 1 FROM price_tiers);

INSERT INTO cities (name, tier_id)
SELECT cp.city, t.id
FROM city_prices cp
JOIN price_tiers t ON t.price = cp.price
WHERE cp.city IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM cities);
