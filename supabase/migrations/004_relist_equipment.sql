-- ============================================================================
-- Put the equipment back on the site, and take down "Site UPDATE"
-- ----------------------------------------------------------------------------
-- All six real listings were set is_active = false during the family drama.
-- Their data was never touched — only their visibility. This flips them back
-- on and retires the one post that isn't equipment.
--
-- Deliberately does NOT touch the five old test rows (tractor, chevy truck,
-- dodge pickup, Cultivator, cultivator 197) — those are soft-deleted and
-- should stay that way.
-- ============================================================================


-- 1. Relist the six real machines.
--    `deleted_at is null` keeps the old test rows out of this.
update public.equipment
set is_active = true
where deleted_at is null
  and name <> 'Site UPDATE'
  and is_active is not true;


-- 2. Retire the "Site UPDATE" post. Soft delete — reversible.
update public.equipment
set deleted_at = now(),
    is_active  = false
where name = 'Site UPDATE'
  and deleted_at is null;


-- 3. Confirm: should show exactly six rows, all VISIBLE.
select
  name,
  is_active,
  case
    when deleted_at is not null then 'DELETED — not on site'
    when is_active is not true  then 'HIDDEN — not on site'
    else 'VISIBLE on site'
  end as shows_on_site
from public.equipment
order by shows_on_site, name;


-- ----------------------------------------------------------------------------
-- To undo everything above:
--
--   update public.equipment set is_active = false
--   where deleted_at is null and name <> 'Site UPDATE';
--
--   update public.equipment set deleted_at = null, is_active = true
--   where name = 'Site UPDATE';
-- ----------------------------------------------------------------------------
