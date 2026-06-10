
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select fetched_at
from "postgres"."public_staging"."stg_exchange_rates"
where fetched_at is null



  
  
      
    ) dbt_internal_test