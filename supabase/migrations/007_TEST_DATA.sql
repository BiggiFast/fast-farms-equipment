-- ============================================================================
-- TEST DATA — creates one fake respondent and pulls in your real equipment.
-- ----------------------------------------------------------------------------
-- This WRITES to the database, but only adds survey rows. It does not touch
-- the equipment listings, the site, or anything a visitor can see.
--
-- Safe to run more than once — it won't create duplicates.
--
-- When you're done testing, 007_TEST_DATA_CLEANUP.sql removes every trace.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- One test respondent. The token generates itself.
-- ---------------------------------------------------------------------------
insert into public.survey_respondents (name)
select 'Test Person'
where not exists (
  select 1 from public.survey_respondents where name = 'Test Person'
);


-- ---------------------------------------------------------------------------
-- One survey item per live equipment listing, photos carried across.
-- ---------------------------------------------------------------------------
-- source = 'equipment' and equipment_id set, so these are linked rather than
-- copied. The photo files still live in the equipment-images bucket.
-- ---------------------------------------------------------------------------
insert into public.survey_items (title, admin_note, source, equipment_id, photos, sort_order)
select
  e.name,
  'TEST DATA',          -- how the cleanup script knows what it may delete
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
  row_number() over (order by e.name)
from public.equipment e
where e.is_active = true
  and e.deleted_at is null
  and not exists (
    select 1 from public.survey_items s where s.equipment_id = e.id
  );


-- ---------------------------------------------------------------------------
-- One photo-less item too, so you can see how a card looks with nothing but a
-- title — some of the real items will be like this.
-- ---------------------------------------------------------------------------
insert into public.survey_items (title, admin_note, sort_order)
select 'The old red disc harrow in the north shed',
       'TEST DATA',
       99
where not exists (
  select 1 from public.survey_items
  where title = 'The old red disc harrow in the north shed'
);


-- ---------------------------------------------------------------------------
-- YOUR TEST LINK. Open the `local_link` while `npm run dev` is running.
-- ---------------------------------------------------------------------------
-- Treat it exactly like a real one — it is a real one, for a fake person.
-- ---------------------------------------------------------------------------
select
  r.name,
  'http://localhost:3000/survey/' || r.token          as local_link,
  'https://www.mrcoryfast.com/survey/' || r.token     as live_link_once_deployed,
  (select count(*) from public.survey_items
    where is_active and deleted_at is null)           as items_to_answer
from public.survey_respondents r
where r.name = 'Test Person';
