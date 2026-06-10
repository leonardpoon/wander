
    
    

with all_values as (

    select
        is_current as value_field,
        count(*) as n_records

    from "postgres"."public_intermediate"."int_fx_scd"
    group by is_current

)

select *
from all_values
where value_field not in (
    'True','False'
)


