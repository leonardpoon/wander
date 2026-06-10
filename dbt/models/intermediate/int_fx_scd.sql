-- US-44

with staged as (
    select * from {{ ref('stg_exchange_rates') }}
),

rate_changes as (

    select
        base_currency,
        target_currency,
        rate,
        fetched_at,

        lag(rate) over (
            partition by base_currency, target_currency
            order by fetched_at
        ) as previous_rate

    from staged
),

filtered_changes as (

    select
        base_currency,
        target_currency,
        rate,
        fetched_at as valid_from
    
    from rate_changes

    where previous_rate is null
        or rate != previous_rate
),

scd as (
    select
        base_currency,
        target_currency,
        rate,
        valid_from,

        lead(valid_from) over (
            partition by base_currency, target_currency
            order by valid_from
        ) as valid_to,

        case
            when lead(valid_from) over (
                partition by base_currency, target_currency
                order by valid_from
            ) is null then true
            else false
        end as is_current

    from filtered_changes
)

select * from scd