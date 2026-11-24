-- LIFE.ARCHIVE journal storage.
-- Run this in the Supabase SQL Editor for the project connected to this app.

create table if not exists public.archive_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  content text not null check (char_length(btrim(content)) between 1 and 20000),
  category text not null check (
    category in ('journal', 'memory', 'mistake', 'lesson', 'reflection', 'future')
  ),
  mood text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.archive_entries enable row level security;

-- The app currently needs only to list and create entries.
revoke all on table public.archive_entries from anon, authenticated;
grant select, insert on table public.archive_entries to authenticated;

drop policy if exists "archive_entries_select_own" on public.archive_entries;
create policy "archive_entries_select_own"
  on public.archive_entries
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "archive_entries_insert_own" on public.archive_entries;
create policy "archive_entries_insert_own"
  on public.archive_entries
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);
