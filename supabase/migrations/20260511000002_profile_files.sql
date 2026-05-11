-- ============================================================
-- Migration: profile_files table + storage bucket for autofill
-- Holds user-uploaded resume / cover letter files that the
-- extension injects into job application file inputs.
-- ============================================================

-- ── Table: profile_files ──────────────────────────────────────
create table if not exists profile_files (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('resume', 'cover_letter')),
  file_name   text not null,
  storage_path text not null,        -- path inside the 'profile-files' bucket
  file_size   integer,               -- bytes
  mime_type   text,
  is_default  boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_profile_files_user_kind on profile_files(user_id, kind);
create index if not exists idx_profile_files_default   on profile_files(user_id, kind, is_default) where is_default = true;

-- ── Trigger: only one default per (user, kind) ────────────────
create or replace function profile_files_ensure_single_default()
returns trigger as $$
begin
  if NEW.is_default then
    update profile_files
       set is_default = false
     where user_id = NEW.user_id
       and kind    = NEW.kind
       and id     <> NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_profile_files_default on profile_files;
create trigger trg_profile_files_default
  after insert or update of is_default on profile_files
  for each row execute function profile_files_ensure_single_default();

-- ── RLS ──────────────────────────────────────────────────────
alter table profile_files enable row level security;

drop policy if exists profile_files_select_own on profile_files;
create policy profile_files_select_own on profile_files
  for select using (auth.uid() = user_id);

drop policy if exists profile_files_insert_own on profile_files;
create policy profile_files_insert_own on profile_files
  for insert with check (auth.uid() = user_id);

drop policy if exists profile_files_update_own on profile_files;
create policy profile_files_update_own on profile_files
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists profile_files_delete_own on profile_files;
create policy profile_files_delete_own on profile_files
  for delete using (auth.uid() = user_id);

-- ── Storage bucket: profile-files ────────────────────────────
-- This MUST be created via Supabase Dashboard → Storage → New bucket
-- with these settings:
--   Name:           profile-files
--   Public:         false  (signed URLs only)
--   File size limit: 5 MB
--   Allowed MIME:   application/pdf, application/msword,
--                   application/vnd.openxmlformats-officedocument.wordprocessingml.document
--
-- After creating, run the storage policies below in the SQL editor:
--
-- create policy "profile_files_storage_insert" on storage.objects
--   for insert with check (
--     bucket_id = 'profile-files' and
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
-- create policy "profile_files_storage_select" on storage.objects
--   for select using (
--     bucket_id = 'profile-files' and
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
-- create policy "profile_files_storage_delete" on storage.objects
--   for delete using (
--     bucket_id = 'profile-files' and
--     (storage.foldername(name))[1] = auth.uid()::text
--   );
