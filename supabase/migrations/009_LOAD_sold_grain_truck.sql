-- ============================================================================
-- OPTIONAL — add the sold grain truck to the survey too.
-- ----------------------------------------------------------------------------
-- The 1995 International Harvester 4900 is hidden from the equipment page
-- because it SOLD. It is deliberately not included by 009_LOAD_equipment_items.
--
-- WHY YOU MIGHT WANT IT ANYWAY: the survey records who ORIGINALLY owned each
-- machine. That question doesn't stop mattering because the machine is gone —
-- if there is ever a question about who the proceeds belonged to, this is the
-- only record of what the family remembered.
--
-- WHY YOU MIGHT NOT: it's one more thing to answer about something nobody can
-- walk out and look at, and the photos are all anyone has to go on.
--
-- Your call. Run this only if you want it in.
--
-- Safe to re-run; it will not add a second copy.
-- ============================================================================

insert into public.survey_items (title, admin_note, source, equipment_id, photos, sort_order)
select
  e.name || ' (sold)',
  'Sold. Included so its ownership is on the record too.',
  'equipment',
  e.id,
  case
    when jsonb_typeof(e.photos) = 'array' and jsonb_array_length(e.photos) > 0
      then e.photos
    when e.image_url is not null
      then jsonb_build_array(
             jsonb_build_object('url', e.image_url, 'is_main', true, 'sort_order', 0)
           )
    else '[]'::jsonb
  end,
  -- Last in the list, after the machines people can still go and look at.
  100
from public.equipment e
where e.deleted_at is null
  and e.is_active = false          -- hidden because it sold
  and e.name ilike '%4900%'
  and not exists (
    select 1
    from public.survey_items s
    where s.equipment_id = e.id
      and s.deleted_at is null
  );


-- What's in the survey now.
select
  i.sort_order    as "order",
  i.title         as item,
  jsonb_array_length(i.photos) as photos,
  coalesce(i.admin_note, '')   as your_note
from public.survey_items i
where i.deleted_at is null
order by i.sort_order, i.created_at;
