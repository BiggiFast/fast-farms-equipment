-- ============================================================================
-- READ-ONLY — run this BEFORE 006_survey.sql. Changes nothing.
-- ----------------------------------------------------------------------------
-- The survey can pull in an existing equipment listing, which means
-- survey_items.equipment_id points at equipment.id. For that link to be
-- created, the two columns have to be the same type.
--
-- The `equipment` table was built before this project started keeping
-- migrations in the repo, so its exact shape isn't written down anywhere here.
-- This asks the database directly.
--
-- Select ALL of it and hit Run. Both rows come back together.
-- Two PASS rows means 006_survey.sql will apply as written.
-- ============================================================================

select subject, question, answer, result from (

  select
    1                                as ord,
    'equipment.id'::text             as subject,
    'What type is it?'::text         as question,
    coalesce(
      (select data_type
       from information_schema.columns
       where table_schema = 'public'
         and table_name   = 'equipment'
         and column_name  = 'id'),
      '(no such column)'
    )                                as answer,
    case
      when (select data_type
            from information_schema.columns
            where table_schema = 'public'
              and table_name   = 'equipment'
              and column_name  = 'id') = 'uuid'
      then 'PASS'
      else 'STOP'
    end                              as result

  union all

  select
    2,
    'equipment.id',
    'Is it the primary key?',
    coalesce(
      (select string_agg(a.attname, ', ')
       from pg_index i
       join pg_attribute a
         on a.attrelid = i.indrelid
        and a.attnum   = any (i.indkey)
       where i.indrelid   = 'public.equipment'::regclass
         and i.indisprimary),
      '(no primary key)'
    ),
    case
      when exists (
        select 1 from pg_index i
        where i.indrelid = 'public.equipment'::regclass
          and i.indisprimary
      ) then 'PASS'
      else 'STOP'
    end

) checks
order by ord;

-- If either row says STOP, paste the whole result back to Claude — one line in
-- 006_survey.sql needs to change to match, and the migration would otherwise
-- fail with a type error.
