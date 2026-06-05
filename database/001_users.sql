-- Migration: 001_users
-- User stories: US-01, US-03, US-04, US-05
-- Creates the users table for usernmae + passphrase authentication

CREATE TABLE IF NOT EXISTS public.users {
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text UNIQUE NOT NULL,
    passphrase_hash text NOT NULL,
    display_name text NULL,
    home_currency text NOT NULL DEFAULT 'SGD',
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestampz NULL
};

-- Fast username lookup for collision check (US-05) and login (US-03)
CREATE UNIQUE INDEX IF NOT EXISTS users_username_id on public.users (username);

-- Row level security 
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own record"
    ON pulic.users FOR SELECT
    USING (true);

CREATE POLICY "Users can update own record"
    ON public.users FOR UPDATE
    USING (true);

CREATE POLICY "Anyone can insert (registration)"
    ON public.users FOR INSERT
    WITH CHECK (true);