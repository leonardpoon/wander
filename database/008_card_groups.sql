-- Group itinerary cards that belong to the same venue or activity cluster.
CREATE TABLE IF NOT EXISTS public.card_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    column_id uuid NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
    title text NOT NULL,
    color text NOT NULL,
    position int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cards
    ADD COLUMN IF NOT EXISTS group_id uuid NULL REFERENCES public.card_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS card_groups_trip_column_idx ON public.card_groups(trip_id, column_id, position);
CREATE INDEX IF NOT EXISTS cards_group_idx ON public.cards(group_id, position);

DROP TRIGGER IF EXISTS card_groups_updated_at ON public.card_groups;
CREATE TRIGGER card_groups_updated_at
    BEFORE UPDATE ON public.card_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.card_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Open access card_groups" ON public.card_groups;
CREATE POLICY "Open access card_groups" ON public.card_groups FOR ALL USING (true);
