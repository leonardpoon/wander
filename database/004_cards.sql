-- CARDS US-11 to US-18

CREATE TABLE IF NOT EXISTS public.cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id uuid NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,

    -- US-14: category and sub-category
    category text NOT NULL CHECK (category IN ('travel', 'sightsee', 'shopping', 'eating')),
    sub_category text NULL,

    -- US-11: core fields
    title text NOT NULL,

    -- US-15: location -> name, lat long 
    location_name text NULL,
    lat numeric(9,6) NULL,
    lng numeric(9,6) NULL,

    -- US-13: time-fence system
    fixed_time boolean NOT NULL DEFAULT false,
    time_value time NULL,

    -- US-16: budget tracking
    budget_amount numeric(12,2) NULL,

    -- US-17: notes and booking details
    notes text NULL,

    -- US-12: position within its column for drag ordering
    position int NOT NULL DEFAULT 0,

    -- US-18: audit timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid NOT NULL REFERENCES public.users(id)
);

-- give all cards for a trip grouped by column everytime the board loads
CREATE INDEX IF NOT EXISTS cards_trip_column_idx ON public.cards(trip_id, column_id);

-- gives all pinnable cards for a trip 
-- User Stories: US15, US-21
CREATE INDEX IF NOT EXISTS cards_trip_map_idx ON public.cards(trip_id, lat, lng);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- card votes
-- User Stories: US-32
CREATE TABLE IF NOT EXISTS public.card_votes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vote text NOT NULL CHECK (vote IN ('up', 'down')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (card_id, user_id)
);

-- packing list
-- User Stories: US-33, US-34
CREATE TABLE IF NOT EXISTS public.packing_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    label text NOT NULL,
    checked boolean NOT NULL DEFAULT false,
    position int NOT NULL DEFAULT 0,
    created_by uuid NOT NULL REFERENCES public.users(id),
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- todo board
-- User Stories: US-35 to US-38
CREATE TABLE IF NOT EXISTS public.todo_columns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    label text NOT NULL,
    position int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.todo_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    column_id uuid NOT NULL REFERENCES public.todo_columns(id) ON DELETE CASCADE,
    title text NOT NULL,

    -- US-37: assignee
    assigned_to_user_id uuid NULL REFERENCES public.users(id),
    assigned_to_name text NULL,

    -- US-36: due date for colour coded deadlines 
    due_date date NULL,
    notes text NULL,
    position int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT one_assignee CHECK (
        NOT (assigned_to_user_id IS NOT NULL AND assigned_to_name IS NOT NULL)
    )
);


-- User Stories: US-43 to US-45 
-- raw pipelines
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS mart;

-- US-43: open-metro weather ingestion 
CREATE TABLE IF NOT EXISTS raw.weather_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    destination text NOT NULL,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    forecast_date date NOT NULL,
    temp_max numeric(5,2) NOT NULL,
    temp_min numeric(5,2) NOT NULL,
    condition text NOT NULL,
    raw_payload jsonb NOT NULL
);

-- dbt query to find latest fetch per destination date
CREATE INDEX IF NOT EXISTS weather_events_dedup_idx ON raw.weather_events(destination, fetched_at DESC);

-- US-44: FX rate ingestion
CREATE TABLE IF NOT EXISTS raw.exchange_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency text NOT NULL,
    target_currency text NOT NULL,
    rate numeric(18,8) NOT NULL,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    raw_payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS exchange_rates_scd_idx ON raw.exchange_rates(base_currency, target_currency, fetched_at DESC);

-- US-45
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz NULL,
    status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
    rows_inserted int NULL,
    error_message text NULL
);

CREATE INDEX IF NOT EXISTS pipeline_runs_freshness_idx ON public.pipeline_runs(pipeline_name, started_at DESC);

-- RLS
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open access cards" ON public.cards FOR ALL USING (true);
CREATE POLICY "Open access card_votes" ON public.card_votes FOR ALL USING (true);
CREATE POLICY "Open access packing_items" ON public.packing_items FOR ALL USING (true);
CREATE POLICY "Open access todo_columns" ON public.todo_columns FOR ALL USING (true);
CREATE POLICY "Open access todo_cards" ON public.todo_cards FOR ALL USING (true);
CREATE POLICY "Open access pipeline_runs" ON public.pipeline_runs FOR ALL USING (true);

GRANT USAGE ON SCHEMA raw  TO anon, authenticated;
GRANT USAGE ON SCHEMA mart TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA raw  TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA mart TO anon, authenticated;