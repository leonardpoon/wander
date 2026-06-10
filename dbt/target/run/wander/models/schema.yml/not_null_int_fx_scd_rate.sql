
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select rate
from "postgres"."public_intermediate"."int_fx_scd"
where rate is null



  
  
      
    ) dbt_internal_test