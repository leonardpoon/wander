-- override dbt's default schema naming behaviour
-- by default dbt prepends the target schema (public) to custom schemas
-- this macro makes it use the custom schema name directly
-- so staging/ -> staging, mart/ -> mart (not public_staging, public_mart)

{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}