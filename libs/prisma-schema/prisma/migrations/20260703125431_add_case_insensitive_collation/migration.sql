CREATE COLLATION IF NOT EXISTS case_insensitive (
  provider = icu,
  locale = 'und-u-ks-level2',
  deterministic = false
);

ALTER TABLE "User"
ALTER COLUMN "username"
TYPE TEXT COLLATE case_insensitive;