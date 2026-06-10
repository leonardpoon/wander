
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select condition
from "postgres"."public_staging"."stg_weather_events"
where condition is null



  
  
      
    ) dbt_internal_test