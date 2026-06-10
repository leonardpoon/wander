
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select forecast_date
from "postgres"."public_mart"."mart_weather_forecasts"
where forecast_date is null



  
  
      
    ) dbt_internal_test