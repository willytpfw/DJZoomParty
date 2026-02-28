-- Migration: Add pin column to app_request table
ALTER TABLE app_request ADD COLUMN IF NOT EXISTS pin VARCHAR(8);
