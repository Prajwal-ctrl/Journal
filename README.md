<<<<<<< HEAD
# Life Archive

A private journal and life archive built with Next.js, Supabase Auth, and Supabase Postgres.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key.
3. Start the app with `npm run dev`.

The app uses the Supabase email/password account as the stable archive identity. Create the account once in the Supabase Dashboard under **Authentication → Users → Add user**, then sign in at `/unlock`. Do not enable public sign-ups for this personal archive.

The `public.archive_entries` table uses owner-scoped row-level security. The connected Supabase project already has this table and RLS enabled. For a new Supabase project, run [`supabase/setup.sql`](./supabase/setup.sql) in its SQL Editor.

## Move existing anonymous entries

After creating the permanent Supabase user, copy its user UUID from **Authentication → Users**. If the project contains entries created by anonymous users, replace the UUID placeholder in [`supabase/migrate-anonymous-entries.sql`](./supabase/migrate-anonymous-entries.sql) and run that script once in the Supabase SQL Editor. It moves only rows owned by anonymous users to the permanent account.

## Deploy

Deploy the repository on Vercel. Add these environment variables for the Production environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (use the Supabase publishable key)

The `.env.local` file is ignored by Git; never commit environment files or a Supabase secret key.
=======
# Journal
>>>>>>> bd1afd3219cf4666df02fe030aa60fb627c1992f
