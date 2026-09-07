-- ============================================================================
-- RUN THIS SECOND, right after 006_survey.sql.
-- ----------------------------------------------------------------------------
-- The one manual step. Until a row exists in survey_admins, the survey admin
-- shows nothing to anybody — including you — because the RLS policies have no
-- one to say yes to. That is the design working, not a bug.
--
-- Replace the email below if you sign into the admin with a different one.
-- ============================================================================

insert into public.survey_admins (user_id, note)
select id, 'Cory'
from auth.users
where email = 'blueburb@gmail.com'
on conflict (user_id) do nothing;


-- Did it work? This must print exactly one row with your email.
-- If it prints NOTHING, the email above doesn't match your Supabase login —
-- run `select email from auth.users;` to see what it actually is.
select
  a.user_id,
  u.email,
  a.note,
  a.created_at
from public.survey_admins a
join auth.users u on u.id = a.user_id;
