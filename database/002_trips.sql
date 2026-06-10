-- US-06, US-07, US-08, US-09, US-10

CREATE TABLE IF NOT EXISTS public.trips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    primary_currency text NOT NULL DEFAULT 'SGD',
    theme_colour text NULL,
    photo_url text NULL,
    room_code text UNIQUE NOT NULL,
    pin_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- US-09: fast room code lookup
CREATE UNIQUE INDEX IF NOT EXISTS trips_room_code_idx ON public.trips(room_code);

-- US-08: multi-destination support
CREATE TABLE IF NOT EXISTS public.destinations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name text NOT NULL,
    country_code text NOT NULL,
    local_currency text NOT NULL,
    colour_hex text NOT NULL,
    position int NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    lat numeric(9,6) NULL,
    lng numeric(9,6) NULL
);

-- trip members
CREATE TABLE IF NOT EXISTS public.trip_members (
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (trip_id, user_id)
);

-- US-06: kanban columns and trip dates
CREATE TABLE IF NOT EXISTS public.columns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    destintation_id uuid NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
    date date NOT NULL,
    label text NULL,
    position int NOT NULL,
    UNIQUE (trip_id, date)
);

-- RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open access trips" ON public.trips FOR ALL USING (true);
CREATE POLICY "Open access destinations" ON public.destinations FOR ALL USING (true);
CREATE POLICY "Open access trip_members" ON public.trip_members FOR ALL USING (true);
CREATE POLICY "Open access columns" ON public.columns FOR ALL USING (true);
