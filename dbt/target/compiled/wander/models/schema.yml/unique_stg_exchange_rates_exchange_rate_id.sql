
    
    

select
    exchange_rate_id as unique_field,
    count(*) as n_records

from "postgres"."public_staging"."stg_exchange_rates"
where exchange_rate_id is not null
group by exchange_rate_id
having count(*) > 1


