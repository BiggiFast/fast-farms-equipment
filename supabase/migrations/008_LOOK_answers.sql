-- ============================================================================
-- READ-ONLY — every answer ever given. Changes nothing.
-- ----------------------------------------------------------------------------
-- This is the audit trail, and the reason the survey is built the way it is.
-- Nothing here is ever updated or overwritten, so if somebody answers
-- "Grandpa" today and "Kirk" next week, BOTH rows are below and the change is
-- on the record.
--
-- The `standing` column tells them apart:
--   current answer — what this person says now
--   superseded     — what they said before they changed it
--
-- Read newest-first within each item. A `superseded` row is not a mistake to
-- clean up; it's evidence, and deleting it is the one thing that would make
-- this whole design pointless.
--
-- (This becomes the Results screen in the admin. It's here so you can watch
-- the recording work before that exists.)
-- ============================================================================

select
  p.name                                             as person,
  i.title                                            as item,
  a.owner                                            as answered,
  a.note,
  case when a.id = newest.id then 'current answer'
       else                       'superseded'  end  as standing,
  a.created_at at time zone 'America/Los_Angeles'    as answered_at,
  a.ip
from public.survey_responses a
join public.survey_respondents p on p.id = a.respondent_id
join public.survey_items       i on i.id = a.item_id
left join lateral (
  -- The most recent answer this person gave for this item.
  select x.id
  from public.survey_responses x
  where x.item_id       = a.item_id
    and x.respondent_id = a.respondent_id
  order by x.created_at desc
  limit 1
) newest on true
order by p.name, i.sort_order, i.created_at, a.created_at desc;
