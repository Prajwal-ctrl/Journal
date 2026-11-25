-- LIFE.ARCHIVE journal storage.
-- Run this in the Supabase SQL Editor for the project connected to this app.

create table if not exists public.archive_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  content text not null check (char_length(btrim(content)) between 1 and 20000),
  category text not null constraint archive_entries_category_format_check
    check (category ~ '^(journal|memory|mistake|lesson|reflection|future|custom_[a-z0-9_]{1,40})$'),
  entry_type text not null default 'paragraph' constraint archive_entries_entry_type_check
    check (entry_type in ('paragraph', 'quick_note', 'todo')),
  is_completed boolean not null default false,
  custom_sections text[] not null default '{}',
  mood text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Allow user-created category slugs while keeping category values constrained.
alter table public.archive_entries
  drop constraint if exists archive_entries_category_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.archive_entries'::regclass
      and conname = 'archive_entries_category_format_check'
  ) then
    alter table public.archive_entries
      add constraint archive_entries_category_format_check
      check (category ~ '^(journal|memory|mistake|lesson|reflection|future|custom_[a-z0-9_]{1,40})$');
  end if;
end $$;

alter table public.archive_entries
  add column if not exists entry_type text not null default 'paragraph',
  add column if not exists is_completed boolean not null default false,
  add column if not exists custom_sections text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.archive_entries'::regclass
      and conname = 'archive_entries_entry_type_check'
  ) then
    alter table public.archive_entries
      add constraint archive_entries_entry_type_check
      check (entry_type in ('paragraph', 'quick_note', 'todo'));
  end if;
end $$;

alter table public.archive_entries enable row level security;

-- The app lists, creates, edits, and deletes the signed-in user's entries.
revoke all on table public.archive_entries from anon, authenticated;
grant select, insert, update, delete on table public.archive_entries to authenticated;

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

drop policy if exists "archive_entries_update_own" on public.archive_entries;
create policy "archive_entries_update_own"
  on public.archive_entries
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "archive_entries_delete_own" on public.archive_entries;
create policy "archive_entries_delete_own"
  on public.archive_entries
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

