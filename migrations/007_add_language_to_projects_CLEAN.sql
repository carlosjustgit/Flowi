-- Migration 007: Add language column to projects table
-- Run this in the Supabase SQL editor

ALTER TABLE projects ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pt';

-- Add a check constraint to ensure only valid values are stored
ALTER TABLE projects ADD CONSTRAINT IF NOT EXISTS projects_language_check CHECK (language IN ('pt', 'en'));
