-- US-43

with deduped as (
    select * from {{ ref('int_weather_deduped') }}
),

final as (
    select
        destination,
        forecast_date,
        temp_max_c,
        temp_min_c,
        condition,

        concat(
            round(temp_min_c, 0)::int,
            '-',
            round(temp_max_c, 0)::int,
            '°C, '
        ) as temp_range_display,

        fetched_at as updated_at
    
    from deduped
)

select * from final