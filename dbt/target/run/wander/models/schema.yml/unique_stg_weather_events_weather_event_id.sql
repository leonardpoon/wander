
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    

select
    weather_event_id as unique_field,
    count(*) as n_records

from "postgres"."public_staging"."stg_weather_events"
where weather_event_id is not null
group by weather_event_id
having count(*) > 1



  
  
      
    ) dbt_internal_test