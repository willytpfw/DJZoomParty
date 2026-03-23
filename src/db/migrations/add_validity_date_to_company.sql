-- Migration: Add validity_date column to company table
-- This date is set to the company creation date + 1 year
ALTER TABLE company ADD COLUMN IF NOT EXISTS validity_date TIMESTAMPTZ;

-- Backfill existing companies: use NOW() + 1 year as default for existing rows
UPDATE company SET validity_date = NOW() + INTERVAL '1 year' WHERE validity_date IS NULL;
