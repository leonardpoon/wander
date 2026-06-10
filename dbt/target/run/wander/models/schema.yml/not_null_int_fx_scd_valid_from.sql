
    select
      count(*) as failures,
      count(*) != 0 as should_warn,
      count(*) != 0 as should_error
    from (
      
    
  
    
    



select valid_from
from "postgres"."public_intermediate"."int_fx_scd"
where valid_from is null



  
  
      
    ) dbt_internal_test