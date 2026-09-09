-- ============================================================================
-- Load the equipment listings into the survey as real items.
-- ----------------------------------------------------------------------------
-- Adds one survey item per LIVE listing on the equipment page, carrying its
-- photos across. Run it once; running it again adds nothing, because it skips
-- any listing already in the survey.
--
-- Does NOT touch the equipment listings themselves, the website, or anything a
-- visitor can see. It only adds rows to survey_items.
--
-- The admin can do this too — Survey → Items → Add an item → "From a listing".
-- This is the same job in one paste.
--
-- IMPORTANT: these items are left with an EMPTY admin note on purpose. The
-- test-data cleanup script deletes rows whose note reads 'TEST DATA', and
-- these are real items that must survive that.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- The five live listings
-- ---------------------------------------------------------------------------
-- source = 'equipment' and equipment_id set, so each item stays LINKED to its
-- listing rather than being a copy. The photo URLs are carried across but the
-- FILES stay in the equipment-images bucket — delete a listing's photos later
-- and the survey item loses its pictures while keeping every answer.
--
-- Ordered alphabetically so the survey has a stable, predictable sequence.
-- Reorder afterwards in the admin (Items → open one → "Order") if you'd rather
-- group them differently.
-- ---------------------------------------------------------------------------
insert into public.survey_items (title, source, equipment_id, photos, sort_order)
select
  e.name,
  'equipment',
  e.id,
  case
    when jsonb_typeof(e.photos) = 'array' and jsonb_array_length(e.photos) > 0
      then e.photos
    -- Older listings predate the photos column and carry a single image_url.
    when e.image_url is not null
      then jsonb_build_array(
             jsonb_build_object('url', e.image_url, 'is_main', true, 'sort_order', 0)
           )
    else '[]'::jsonb
  end,
  row_number() over (order by e.name)
from public.equipment e
where e.is_active = true
  and e.deleted_at is null
  and not exists (
    -- Already in the survey: leave it exactly as it is. This is what makes the
    -- script safe to re-run, and it will not overwrite a title you have edited.
    select 1
    from public.survey_items s
    where s.equipment_id = e.id
      and s.deleted_at is null
  );


-- ---------------------------------------------------------------------------
-- What's in the survey now
-- ---------------------------------------------------------------------------
-- Supabase's SQL editor only shows the LAST statement's result, so this is the
-- one you'll see. Expect one row per machine, each with its photo count.
-- ---------------------------------------------------------------------------
select
  i.sort_order                                   as "order",
  i.title                                        as item,
  case when i.is_active then 'in the survey'
       else 'hidden' end                         as status,
  jsonb_array_length(i.photos)                   as photos,
  case when i.source = 'equipment' then 'from a listing'
       else 'added directly' end                 as came_from,
  (select count(*) from public.survey_responses r
    where r.item_id = i.id)                      as answers_so_far
from public.survey_items i
where i.deleted_at is null
order by i.sort_order, i.created_at;
