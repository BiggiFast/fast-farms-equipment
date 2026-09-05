-- ============================================================================
-- READ-ONLY — confirm the slugs came out right. Changes nothing.
-- ============================================================================

select
  name                as listing,
  slug                as url_slug,
  '/equipment/' || slug as full_url,
  case when is_active then 'live' else 'hidden' end as visibility,
  case when deleted_at is not null then 'deleted' else '-' end as deleted
from public.equipment
order by deleted_at nulls first, is_active desc, name;
