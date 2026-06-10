-- US-44

with source as (
    select * from "postgres"."raw"."exchange_rates"
),

renamed as (
    select
        id as exchange_rate_id,

        upper(trim(base_currency)) as base_currency,
        upper(trim(target_currency)) as target_currency,

        rate::numeric(18,6) as rate,

        fetched_at as fetched_at,

        raw_payload as raw_payload

    from source
)

select * from renamed