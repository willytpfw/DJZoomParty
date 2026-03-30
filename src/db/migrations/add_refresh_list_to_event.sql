-- Migration: Add refresh_list boolean column to event table
-- This field indicates whether music should be automatically added to the YouTube playlist ordered by votes

ALTER TABLE event
ADD COLUMN IF NOT EXISTS refresh_list BOOLEAN DEFAULT FALSE;
