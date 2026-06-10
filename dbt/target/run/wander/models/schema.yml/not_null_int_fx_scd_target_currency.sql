
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select target_currency
from "postgres"."public_intermediate"."int_fx_scd"
where target_currency is null



  
  
      
    ) dbt_internal_test