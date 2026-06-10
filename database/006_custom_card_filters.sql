-- Allow trip cards to use user-defined filter/category ids.
ALTER TABLE public.cards
    DROP CONSTRAINT IF EXISTS cards_category_check;

CREATE TABLE IF NOT EXISTS public.card_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    category_id text NOT NULL,
    label text NOT NULL,
    color text NOT NULL,
    position int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (trip_id, category_id)
);

CREATE INDEX IF NOT EXISTS card_categories_trip_idx
    ON public.card_categories(trip_id, position);

ALTER TABLE public.card_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open access card_categories"
    ON public.card_categories FOR ALL USING (true);

GRANT ALL ON public.card_categories TO anon, authenticated;
