
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select weather_event_id
from "postgres"."public_staging"."stg_weather_events"
where weather_event_id is null



  
  
      
    ) dbt_internal_test