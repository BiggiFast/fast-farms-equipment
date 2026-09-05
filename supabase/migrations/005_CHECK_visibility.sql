-- ============================================================================
-- READ-ONLY — which listings are actually visible on the site right now?
-- ============================================================================

select
  name,
  is_active,
  deleted_at,
  case
    when deleted_at is not null then 'DELETED — not on site'
    when is_active is not true  then 'HIDDEN — not on site'
    else 'VISIBLE on site'
  end as shows_on_site
from public.equipment
order by shows_on_site, name;
