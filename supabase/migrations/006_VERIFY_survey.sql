-- ============================================================================
-- READ-ONLY — prove the survey locked itself shut. Changes nothing.
-- ----------------------------------------------------------------------------
-- Run this AFTER 006_survey.sql. Select all of it, hit Run, and read the
-- `result` column: every row should say PASS. Anything saying FAIL is a real
-- hole — stop and fix it before sending anyone a link.
--
-- This is one single query on purpose. Supabase's results pane only ever shows
-- the LAST statement you ran, so a file full of separate checks would quietly
-- hide all but the final one.
--
-- This file only reads the database's own catalogue, never the survey tables
-- themselves, so it can't error out. Run it too early and it simply tells you
-- the tables are missing.
-- ============================================================================

with expected(tbl) as (
  values ('survey_admins'::text), ('survey_respondents'), ('survey_items'),
         ('survey_responses'), ('survey_access_log')
),
tbls as (
  select e.tbl, c.oid, c.relrowsecurity
  from expected e
  left join pg_class c
    on  c.relname     = e.tbl
    and c.relnamespace = 'public'::regnamespace
    and c.relkind     = 'r'
)
select check_name, subject, result from (

  -- 1 ── The five tables exist, and each has Row Level Security switched on.
  --      RLS off means the public key could read the whole table.
  select
    1                                   as ord,
    '1. table exists, RLS on'::text     as check_name,
    t.tbl                               as subject,
    case
      when t.oid is null           then 'FAIL — missing. Run 006_survey.sql first'
      when not t.relrowsecurity    then 'FAIL — Row Level Security is OFF'
      else                              'PASS'
    end::text                           as result
  from tbls t

  union all

  -- 2 ── The public key holds no privileges on any survey table at all.
  select
    2, '2. public key has no direct access', 'all survey tables',
    case
      when count(*) = 0 then 'PASS — anon holds no table privileges'
      else 'FAIL — anon can reach '
           || string_agg(distinct table_name || ' (' || privilege_type || ')', ', ')
    end
  from information_schema.role_table_grants
  where grantee      = 'anon'
    and table_schema = 'public'
    and table_name like 'survey%'

  union all

  -- 3 ── No policy anywhere lets anon in. Respondents come through the
  --      functions or not at all.
  select
    3, '3. no policy admits the public key', 'all survey tables',
    case
      when count(*) = 0 then 'PASS — no anon or public policies exist'
      else 'FAIL — ' || string_agg(tablename || ' / ' || policyname, ', ')
    end
  from pg_policies
  where schemaname = 'public'
    and tablename like 'survey%'
    and ('anon' = any (roles) or 'public' = any (roles))

  union all

  -- 4 ── Every elevated function pins its search_path and builds no SQL from
  --      its arguments. These are the two ways such a function gets turned
  --      against you.
  select
    4, '4. elevated function is hardened', p.proname::text,
    case
      when not p.prosecdef then 'n/a — not SECURITY DEFINER'
      when p.proconfig is null
        or not (p.proconfig::text like '%search_path%')
                           then 'FAIL — search_path is not pinned'
      when p.prosrc ~* '\mexecute\M'
                           then 'FAIL — contains dynamic SQL'
      else                      'PASS'
    end
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and (p.proname like 'survey%' or p.proname = 'is_survey_admin')

  union all

  -- 5 ── Which functions can the public key call? Only the intended four.
  --      is_survey_admin must NOT appear here.
  select
    5, '5. callable by the public key', p.proname::text,
    case
      when p.proname in ('survey_open', 'survey_load',
                         'survey_answer', 'survey_progress')
      then 'PASS — one of the four, expected'
      else 'FAIL — anon must not be able to call this'
    end
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and has_function_privilege('anon', p.oid, 'execute')
    and p.proname like '%survey%'

  union all

  -- 6 ── And there are exactly four of them, no more.
  select
    6, '6. exactly four doors, no more', 'count',
    case
      when count(*) = 4 then 'PASS — four, as designed'
      else 'FAIL — expected 4, found ' || count(*)
    end
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and has_function_privilege('anon', p.oid, 'execute')
    and p.proname like '%survey%'

  union all

  -- 7 ── Nobody can edit an answer in place — not even the admin. The
  --      append-only history is the point of this whole design.
  select
    7, '7. answers cannot be edited', 'survey_responses',
    case
      when count(*) = 0 then 'PASS — no UPDATE policy exists'
      else 'FAIL — editable through ' || string_agg(policyname, ', ')
    end
  from pg_policies
  where schemaname = 'public'
    and tablename  = 'survey_responses'
    and cmd in ('UPDATE', 'ALL')

  union all

  -- 8 ── The view reads with the caller's privileges, not its owner's.
  --      Otherwise it hands out the underlying rows past every policy above.
  select
    8, '8. view runs as the caller', 'survey_current_responses',
    coalesce(
      (select case
                when c.reloptions::text ilike '%security_invoker=true%'
                then 'PASS'
                else 'FAIL — the view runs as its owner'
              end
       from pg_class c
       where c.relname      = 'survey_current_responses'
         and c.relnamespace = 'public'::regnamespace),
      'FAIL — the view is missing'
    )

  union all

  -- 9 ── The photo bucket exists and is readable by URL, like the rest of the
  --      site's images.
  select
    9, '9. image bucket ready', 'survey-images',
    coalesce(
      (select case when public then 'PASS — public read'
                   else 'FAIL — not public read' end
       from storage.buckets where id = 'survey-images'),
      'FAIL — the bucket is missing'
    )

) checks
order by ord, subject;
