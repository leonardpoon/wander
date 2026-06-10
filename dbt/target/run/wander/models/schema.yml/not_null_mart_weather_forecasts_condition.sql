
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select condition
from "postgres"."public_mart"."mart_weather_forecasts"
where condition is null



  
  
      
    ) dbt_internal_test