
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select destination
from "postgres"."public_intermediate"."int_weather_deduped"
where destination is null



  
  
      
    ) dbt_internal_test