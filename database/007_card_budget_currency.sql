-- Store the currency used for each card budget amount.
ALTER TABLE public.cards
    ADD COLUMN IF NOT EXISTS budget_currency text NULL;

