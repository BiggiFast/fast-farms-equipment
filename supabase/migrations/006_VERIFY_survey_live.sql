-- ============================================================================
-- READ-ONLY — prove the locks actually behave. Changes nothing.
-- ----------------------------------------------------------------------------
-- Run this LAST, after 006_survey.sql and 006_SEED_admin.sql.
--
-- 006_VERIFY_survey.sql checks how the database is CONFIGURED. This one
-- actually calls the functions with a made-up link and watches them refuse it.
-- Configuration can look right and still behave wrong.
--
-- One single query — select all of it and hit Run. Both rows should say PASS.
--
-- It is separate from the other verify file because it touches the survey
-- tables directly, so running it before the migration gives a Postgres error
-- rather than a helpful answer.
-- ============================================================================

select check_name, detail, result from (

  -- 1 ── There is at least one survey admin. Zero means the admin screens
  --      will show you nothing at all — not an empty list, nothing — because
  --      the policies have nobody to say yes to.
  select
    1                                        as ord,
    '1. an admin exists'::text               as check_name,
    coalesce(
      (select string_agg(u.email::text, ', ')
       from public.survey_admins a
       join auth.users u on u.id = a.user_id),
      '(nobody)'
    )                                        as detail,
    case
      when exists (select 1 from public.survey_admins) then 'PASS'
      else 'FAIL — run 006_SEED_admin.sql'
    end::text                                as result

  union all

  -- 2 ── A link nobody was ever sent gets nothing back. All three anon-facing
  --      reads must refuse it, and none of them may error — an error message
  --      is itself a clue we don't want to hand a stranger.
  select
    2,
    '2. a made-up link is refused',
    'a token of 32 zeros',
    case
      when exists (select 1 from public.survey_open(repeat('0', 32), null, null))
        then 'FAIL — survey_open returned a person'
      when public.survey_load(repeat('0', 32), null, null) is not null
        then 'FAIL — survey_load returned data'
      when public.survey_answer(repeat('0', 32), gen_random_uuid(), 'Doug') ->> 'reason'
           is distinct from 'inactive'
        then 'FAIL — survey_answer accepted the answer'
      else 'PASS — all three refused it'
    end

) checks
order by ord;
