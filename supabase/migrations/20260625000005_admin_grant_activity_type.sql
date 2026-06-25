-- Add admin_grant to activity_type enum so admin credit grants appear in usage_log.

ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'admin_grant';
