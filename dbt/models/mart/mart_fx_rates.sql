-- US-44

with scd as (
    select * from {{ ref('int_fx_scd') }}
),

final as (
    select
        base_currency,
        target_currency,
        rate,
        valid_from,
        valid_to,
        is_current,

        concat(
            '1',
            base_currency,
            ' = ',
            round(rate, 4)::text,
            ' ',
            target_currency
        ) as rate_display,

        valid_from as updated_at
    from scd
)

select * from final