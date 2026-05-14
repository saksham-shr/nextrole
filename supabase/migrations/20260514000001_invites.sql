-- Invite system: admin sends invite emails, invited users get pro tier for 30 days

CREATE TABLE IF NOT EXISTS invites (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email       TEXT        NOT NULL,
  invited_by  TEXT        NULL,
  tier        TEXT        NOT NULL DEFAULT 'pro',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  used_at     TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS invites_email_idx ON invites (lower(email));

-- RLS: only service role can write; authenticated users can read their own invite
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_invite"
  ON invites FOR SELECT
  USING (lower(email) = lower(auth.email()));

-- Waitlist table (if not already exists)
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT        NOT NULL,
  tier       TEXT        NOT NULL DEFAULT 'pro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_tier_idx ON waitlist (lower(email), tier);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (true);
