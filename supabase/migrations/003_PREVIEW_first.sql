-- ============================================================================
-- READ-ONLY PREVIEW — run this BEFORE 003_equipment_slugs.sql
-- ----------------------------------------------------------------------------
-- Shows exactly what slug each listing WOULD get. Changes nothing.
-- Supabase may still warn about "destructive operations" because of the
-- drop below — that drop only removes this temporary preview helper.
-- ============================================================================

create or replace function public.preview_slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

with numbered as (
  select
    id,
    name,
    deleted_at,
    public.preview_slugify(name) as base,
    row_number() over (
      partition by public.preview_slugify(name)
      order by created_at
    ) as n
  from public.equipment
)
select
  name                                as current_name,
  case
    when base = ''   then 'item-' || left(id::text, 8)
    when n = 1       then base
    else base || '-' || n
  end                                 as proposed_url_slug,
  case
    when base = ''   then 'BLANK NAME -> id fallback'
    when n > 1       then 'DUPLICATE NAME -> numbered'
    else 'ok'
  end                                 as note,
  case when deleted_at is not null then 'soft-deleted' else 'live' end as state
from numbered
order by note desc, current_name;

-- Clean up the preview helper
drop function if exists public.preview_slugify(text);
