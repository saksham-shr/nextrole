-- Add auto_evaluate flag to scan_sources
-- When true, newly added jobs are automatically passed through /api/pipeline after each scan.

ALTER TABLE scan_sources ADD COLUMN IF NOT EXISTS auto_evaluate boolean NOT NULL DEFAULT false;
