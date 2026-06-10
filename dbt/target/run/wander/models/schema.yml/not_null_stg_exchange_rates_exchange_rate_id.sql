
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select exchange_rate_id
from "postgres"."public_staging"."stg_exchange_rates"
where exchange_rate_id is null



  
  
      
    ) dbt_internal_test