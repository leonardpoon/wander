-- User Stories: US-28, US-29, US-30

CREATE TABLE IF NOT EXISTS public.trip_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    token text UNIQUE NOT NULL,
    pin_hash text NOT NULL,
    role text NOT NULL CHECK (role IN ('editor', 'viewer')),
    expires_at timestamptz NOT NULL,
    max_uses int NuLL,
    use_count int NOT NULL DEFAULT 0,
    revoked_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- fast token lookup
CREATE UNIQUE INDEX IF NOT EXISTS trip_invites_token_idx ON public.trip_invites(token);

ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access trip_invites" ON public.trip_invites FOR ALL USING (true);