-- US-43

with staged as (
    select * from "postgres"."staging"."stg_weather_events"
),

deduplicated as (
    select distinct on (destination, forecast_date)
        weather_event_id,
        destination,
        forecast_date,
        temp_max_c,
        temp_min_c,
        condition,
        fetched_at
    from staged

    order by destination, forecast_date, fetched_at desc
)

select * from deduplicated