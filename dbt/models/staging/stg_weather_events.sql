-- US-43

with source as (
    select * from {{ source('raw', 'weather_events') }}
),

renamed as (
    select
        id as weather_event_id,
        destination as destination,
        forecast_date as forecast_date,
        fetched_at as fetched_at,

        temp_max::numeric(5,2) as temp_max_c,
        temp_min::numeric(5,2) as temp_min_c,

        trim(lower(condition)) as condition,

        raw_payload as raw_payload

    from source
)

select * from renamed