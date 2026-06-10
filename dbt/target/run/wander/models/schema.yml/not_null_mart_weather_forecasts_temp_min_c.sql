
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select temp_min_c
from "postgres"."public_mart"."mart_weather_forecasts"
where temp_min_c is null



  
  
      
    ) dbt_internal_test