-- Run once in the Supabase SQL Editor after creating the permanent archive user.
-- Replace the placeholder with that user's UUID from Authentication > Users.
-- This moves archive entries owned by anonymous users to the permanent account.

do $$
declare
  target_user_id uuid := 'REPLACE-WITH-PERMANENT-SUPABASE-USER-UUID';
  migrated_count integer;
begin
  if not exists (
    select 1
    from auth.users
    where id = target_user_id
      and is_anonymous is false
  ) then
    raise exception 'Target must be an existing non-anonymous Supabase user.';
  end if;

  update public.archive_entries as entries
  set owner_id = target_user_id
  where entries.owner_id in (
    select id
    from auth.users
    where is_anonymous is true
  );

  get diagnostics migrated_count = row_count;
  raise notice 'Moved % archive entries to the permanent user.', migrated_count;
end;
$$;
