-- Adds destination coordinates used by weather forecasts.
-- Run this against Supabase for existing deployments.

ALTER TABLE public.destinations
    ADD COLUMN IF NOT EXISTS lat numeric(9,6) NULL,
    ADD COLUMN IF NOT EXISTS lng numeric(9,6) NULL;

CREATE INDEX IF NOT EXISTS destinations_trip_location_idx
    ON public.destinations(trip_id, lat, lng);
