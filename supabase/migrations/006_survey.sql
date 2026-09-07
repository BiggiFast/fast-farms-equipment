-- ============================================================================
-- MrCoryFast — Equipment Ownership Survey (schema + access functions)
-- ----------------------------------------------------------------------------
-- A temporary, invite-only survey asking family who originally owned each
-- piece of equipment, so that knowledge is captured before it is lost.
-- Full reasoning: docs/SURVEY_SPEC.md (v2).
--
-- Built to be REMOVABLE. When the survey is done, everything it touched is:
--   drop view  public.survey_current_responses;
--   drop table public.survey_access_log, public.survey_responses,
--              public.survey_items, public.survey_respondents,
--              public.survey_admins;
--   drop function public.survey_open, public.survey_load,
--                 public.survey_answer, public.survey_progress,
--                 public.is_survey_admin;
--   (and delete the `survey-images` storage bucket)
--
-- ----------------------------------------------------------------------------
-- HOW ACCESS WORKS — the one thing to understand before reading further
-- ----------------------------------------------------------------------------
-- This feature adds NO new secrets. It runs on the same public anon key the
-- rest of the site already uses, because the repo is public and a leaked
-- service-role key could not be un-leaked.
--
-- RESPONDENTS have no account. Every survey table is locked shut against the
-- `anon` role — RLS on, no anon policies, and an explicit REVOKE. The ONLY way
-- an anonymous visitor touches survey data is through the four SECURITY
-- DEFINER functions at the bottom of this file, each of which takes the
-- person's token and validates it internally.
--
-- ADMINS are authenticated Supabase users listed in `survey_admins`. The check
-- lives in the RLS policies themselves, so a route handler that forgets to
-- check cannot leak anything — there is nothing privileged for it to reach.
--
-- Safe to re-run.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- SURVEY_ADMINS — who may administer the survey
-- ---------------------------------------------------------------------------
-- Referenced (indirectly, via is_survey_admin()) by every admin policy below.
-- Seeded by hand in the Supabase SQL editor — see 006_SEED_admin.sql. There is
-- deliberately no INSERT/UPDATE/DELETE policy on this table, so survey
-- administrators cannot be added through the website by anyone, ever. Changing
-- who is an admin requires database access.
-- ---------------------------------------------------------------------------
create table if not exists public.survey_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- SURVEY_RESPONDENTS — one row per family member
-- ---------------------------------------------------------------------------
create table if not exists public.survey_respondents (
  id               uuid primary key default gen_random_uuid(),

  name             text not null,

  -- The credential. 16 random bytes as hex = 32 characters. Nobody holds this
  -- unless it was deliberately sent to them, which is the whole point: unlike
  -- a phone number, a family member does not already know it.
  --
  -- NEVER include this column in anything sent to a respondent's browser. It
  -- appears in exactly one place: the admin's "Copy link" button.
  token            text not null unique
                     default encode(gen_random_bytes(16), 'hex'),

  -- THE KILL SWITCH. false = the link is dead on its very next request.
  -- Answers already given are kept.
  is_active        boolean not null default true,

  -- Answers become read-only. Viewing still works.
  is_frozen        boolean not null default false,

  -- Set when a link is regenerated, so "when did this link change" is on the
  -- record rather than inferred.
  token_rotated_at timestamptz,

  created_at       timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- SURVEY_ITEMS — the things being asked about
-- ---------------------------------------------------------------------------
create table if not exists public.survey_items (
  id              uuid primary key default gen_random_uuid(),

  title           text not null,

  -- Cory's own note to himself. NEVER shown to respondents.
  admin_note      text,

  -- 'upload'    — photographed straight into the survey
  -- 'equipment' — pulled from an existing listing on the site
  source          text not null default 'upload'
                    check (source in ('upload', 'equipment')),

  -- on delete SET NULL is deliberate: deleting an equipment listing must never
  -- take a survey item, or the answers about it, down with it.
  equipment_id    uuid references public.equipment(id) on delete set null,

  -- [{ "url": "...", "is_main": true, "sort_order": 0 }] — the same shape as
  -- `equipment` and `updates`, so lib/photos.js reads these unchanged.
  photos          jsonb not null default '[]'::jsonb,

  -- Inactive disappears from the survey but keeps its answers.
  is_active       boolean not null default true,

  -- Cory's conclusion. NEVER sent to respondents — it would lead the witness.
  confirmed_owner text,

  sort_order      integer not null default 0,

  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);


-- ---------------------------------------------------------------------------
-- SURVEY_RESPONSES — append-only
-- ---------------------------------------------------------------------------
-- Every answer is a NEW ROW. Nothing is ever updated. There is deliberately NO
-- unique constraint on (item_id, respondent_id): someone who says "Grandpa" on
-- Tuesday and "Kirk" on Friday leaves both rows behind, and the change is
-- visible rather than silent. That is the integrity guarantee this whole
-- design exists to provide.
-- ---------------------------------------------------------------------------
create table if not exists public.survey_responses (
  id            uuid primary key default gen_random_uuid(),

  item_id       uuid not null references public.survey_items(id)       on delete cascade,
  respondent_id uuid not null references public.survey_respondents(id) on delete cascade,

  -- Kept in step with OWNER_OPTIONS in lib/survey.js. This constraint is the
  -- backstop: a bad value cannot reach the table even if the application
  -- validation is bypassed entirely. survey_answer() turns a violation here
  -- into a clean 'bad_owner' answer rather than an error.
  owner         text not null
                  check (owner in ('Grandpa', 'Doug', 'Kaley', 'Kirk', 'Not sure')),

  note          text check (note is null or length(note) <= 2000),

  created_at    timestamptz not null default now(),

  -- First entry of x-forwarded-for. Captured in a route handler, because a
  -- browser cannot report its own address honestly.
  ip            text
);


-- ---------------------------------------------------------------------------
-- SURVEY_ACCESS_LOG — makes forwarding visible
-- ---------------------------------------------------------------------------
-- Written by survey_open() and survey_load(). One link opened from four
-- devices in three places is a link that got passed around. Never shown to
-- respondents.
-- ---------------------------------------------------------------------------
create table if not exists public.survey_access_log (
  id            uuid primary key default gen_random_uuid(),
  respondent_id uuid not null references public.survey_respondents(id) on delete cascade,
  occurred_at   timestamptz not null default now(),
  ip            text,
  user_agent    text
);


-- ---------------------------------------------------------------------------
-- INDEXES — the queries this feature actually runs
-- ---------------------------------------------------------------------------

-- "Give me this person's latest answer for this item" — the survey's hot path.
-- created_at desc so the newest row is the first one read.
create index if not exists survey_responses_current_idx
  on public.survey_responses (item_id, respondent_id, created_at desc);

-- The Results matrix walks every answer for a person.
create index if not exists survey_responses_respondent_idx
  on public.survey_responses (respondent_id, created_at desc);

-- The card order in the survey, and the admin's Items list.
create index if not exists survey_items_order_idx
  on public.survey_items (sort_order, created_at)
  where is_active = true and deleted_at is null;

-- "Last seen" and the device count in the admin's People tab.
create index if not exists survey_access_log_respondent_idx
  on public.survey_access_log (respondent_id, occurred_at desc);


-- ---------------------------------------------------------------------------
-- SURVEY_CURRENT_RESPONSES — the latest answer per person per item
-- ---------------------------------------------------------------------------
-- Everything that reads "the current answer" reads this. The Results matrix
-- compares it against the full table to flag anyone whose answer changed.
--
-- security_invoker = true is important. Without it a view runs with its
-- OWNER's privileges, which would quietly hand the underlying rows to anyone
-- allowed to query the view. With it, the RLS policies below apply to whoever
-- is actually asking.
-- ---------------------------------------------------------------------------
drop view if exists public.survey_current_responses;
create view public.survey_current_responses
  with (security_invoker = true)
as
select distinct on (item_id, respondent_id) *
from public.survey_responses
order by item_id, respondent_id, created_at desc;


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.survey_admins      enable row level security;
alter table public.survey_respondents enable row level security;
alter table public.survey_items       enable row level security;
alter table public.survey_responses   enable row level security;
alter table public.survey_access_log  enable row level security;


-- ---------------------------------------------------------------------------
-- Slam the door on the public key.
-- ---------------------------------------------------------------------------
-- Supabase grants ALL on new tables in `public` to anon and authenticated by
-- default, and RLS-with-no-policy already denies everything. This REVOKE is
-- belt and braces: if a policy is ever added to the wrong role by accident,
-- the missing grant still stops it.
-- ---------------------------------------------------------------------------
revoke all on public.survey_admins            from anon;
revoke all on public.survey_respondents       from anon;
revoke all on public.survey_items             from anon;
revoke all on public.survey_responses         from anon;
revoke all on public.survey_access_log        from anon;
revoke all on public.survey_current_responses from anon;


-- ---------------------------------------------------------------------------
-- is_survey_admin() — "is the person asking one of my admins?"
-- ---------------------------------------------------------------------------
-- Every admin policy calls this instead of sub-querying survey_admins
-- directly, for a specific reason: a policy that reads an RLS-protected table
-- also triggers THAT table's policies. Pointing survey_admins' own policy at
-- survey_admins would recurse, and pointing the other tables at it would make
-- them depend on a second policy evaluating correctly.
--
-- SECURITY DEFINER sidesteps both: the lookup runs as the function's owner, so
-- it reads the membership list directly and the answer is a plain boolean.
--
-- This is NOT one of the four anon-facing functions. It is granted to
-- `authenticated` only — an anonymous visitor cannot call it.
-- ---------------------------------------------------------------------------
create or replace function public.is_survey_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.survey_admins a where a.user_id = auth.uid()
  );
$$;

-- Revoking from PUBLIC is not enough on its own. Supabase hands out EXECUTE
-- on new functions in this schema to `anon` and `authenticated` DIRECTLY, and
-- a revoke aimed at PUBLIC does not remove a grant made to a named role. anon
-- has to be named explicitly or it keeps the privilege it was given.
revoke all     on function public.is_survey_admin() from public;
revoke all     on function public.is_survey_admin() from anon;
grant  execute on function public.is_survey_admin() to authenticated;


-- ---------------------------------------------------------------------------
-- Admin policies. No `anon` policy appears anywhere in this file, on purpose.
-- ---------------------------------------------------------------------------

-- survey_admins is READ-ONLY even to admins: membership changes require the
-- SQL editor. Nobody can grant themselves administration through the website.
drop policy if exists "admins read the admin list" on public.survey_admins;
create policy "admins read the admin list"
  on public.survey_admins for select
  to authenticated
  using (public.is_survey_admin());

drop policy if exists "admins manage respondents" on public.survey_respondents;
create policy "admins manage respondents"
  on public.survey_respondents for all
  to authenticated
  using (public.is_survey_admin())
  with check (public.is_survey_admin());

drop policy if exists "admins manage items" on public.survey_items;
create policy "admins manage items"
  on public.survey_items for all
  to authenticated
  using (public.is_survey_admin())
  with check (public.is_survey_admin());

-- Read and delete only. Admins must not be able to UPDATE an answer — the
-- append-only history is worthless if the person holding the results can
-- quietly edit them. New rows arrive through survey_answer() alone.
drop policy if exists "admins read responses" on public.survey_responses;
create policy "admins read responses"
  on public.survey_responses for select
  to authenticated
  using (public.is_survey_admin());

drop policy if exists "admins delete responses" on public.survey_responses;
create policy "admins delete responses"
  on public.survey_responses for delete
  to authenticated
  using (public.is_survey_admin());

drop policy if exists "admins read the access log" on public.survey_access_log;
create policy "admins read the access log"
  on public.survey_access_log for select
  to authenticated
  using (public.is_survey_admin());


-- ============================================================================
-- THE FOUR ANON-FACING FUNCTIONS
-- ----------------------------------------------------------------------------
-- This is the feature's real attack surface, so read the rules before editing:
--
--   * SET search_path = public, pg_temp on every one, no exceptions. Without
--     it a caller can point the search path at tables they control and the
--     elevated function operates on those instead. That is the classic
--     SECURITY DEFINER privilege-escalation route.
--   * NO dynamic SQL. No EXECUTE format(...). Injection here would run with
--     the owner's privileges.
--   * Every argument validated before use.
--   * Return only the caller's own rows. Never admin_note. Never
--     confirmed_owner. Never another respondent's answers.
--   * Re-check is_active on EVERY call, so revoking someone locks them out on
--     their very next request rather than when something expires.
--   * An unknown token and a revoked token return exactly the same thing. The
--     screen must not tell a stranger which one they are holding.
--
-- No rate limiting: there is no login to brute-force, and a 32-character
-- random token is not guessable.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- survey_open — validate a token, log the visit, return whose link it is
-- ---------------------------------------------------------------------------
-- Powers the confirmation screen. Returning the NAME is the forwarding check:
-- someone handed a link that isn't theirs sees a name that isn't theirs.
--
-- Returns no rows for any token that isn't a live one.
-- ---------------------------------------------------------------------------
create or replace function public.survey_open(
  p_token      text,
  p_ip         text default null,
  p_user_agent text default null
)
returns table (name text, is_frozen boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id     uuid;
  v_name   text;
  v_frozen boolean;
begin
  -- Cheap shape check first, so junk never reaches the table or the log.
  if p_token is null or length(p_token) <> 32 then
    return;
  end if;

  select r.id, r.name, r.is_frozen
    into v_id, v_name, v_frozen
  from public.survey_respondents r
  where r.token = p_token
    and r.is_active
  limit 1;

  if v_id is null then
    return;                       -- unknown or revoked: indistinguishable
  end if;

  insert into public.survey_access_log (respondent_id, ip, user_agent)
  values (v_id, left(p_ip, 100), left(p_user_agent, 300));

  return query select v_name, v_frozen;
end;
$$;


-- ---------------------------------------------------------------------------
-- survey_load — the survey itself: active items + THIS person's answers
-- ---------------------------------------------------------------------------
-- Returns one JSON object:
--   { "name": "...", "is_frozen": false,
--     "items": [ { "id", "title", "photos", "owner", "note" }, ... ] }
--
-- `owner` and `note` are the caller's own current answer, or null. The columns
-- are listed out by hand rather than selected with * so that admin_note and
-- confirmed_owner cannot leak into the payload by accident later.
--
-- Returns SQL NULL for any token that isn't a live one.
-- ---------------------------------------------------------------------------
create or replace function public.survey_load(
  p_token      text,
  p_ip         text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id     uuid;
  v_name   text;
  v_frozen boolean;
  v_items  jsonb;
begin
  if p_token is null or length(p_token) <> 32 then
    return null;
  end if;

  select r.id, r.name, r.is_frozen
    into v_id, v_name, v_frozen
  from public.survey_respondents r
  where r.token = p_token
    and r.is_active
  limit 1;

  if v_id is null then
    return null;
  end if;

  insert into public.survey_access_log (respondent_id, ip, user_agent)
  values (v_id, left(p_ip, 100), left(p_user_agent, 300));

  -- The lateral join reads the newest answer for this item BY THIS PERSON.
  -- Pinning respondent_id inside the subquery is what makes the survey blind:
  -- there is no code path here that could return somebody else's answer.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id',     i.id,
               'title',  i.title,
               'photos', i.photos,
               'owner',  mine.owner,
               'note',   mine.note
             )
             order by i.sort_order, i.created_at
           ),
           '[]'::jsonb
         )
    into v_items
  from public.survey_items i
  left join lateral (
    select r.owner, r.note
    from public.survey_responses r
    where r.item_id = i.id
      and r.respondent_id = v_id
    order by r.created_at desc
    limit 1
  ) mine on true
  where i.is_active = true
    and i.deleted_at is null;

  return jsonb_build_object(
    'name',      v_name,
    'is_frozen', v_frozen,
    'items',     v_items
  );
end;
$$;


-- ---------------------------------------------------------------------------
-- survey_answer — append one answer
-- ---------------------------------------------------------------------------
-- Returns { "ok": true } or { "ok": false, "reason": "..." } where reason is
-- one of: inactive | frozen | unknown_item | bad_owner.
--
-- respondent_id is derived from the TOKEN and never from the caller, so there
-- is no argument anyone could tamper with to answer as somebody else.
-- ---------------------------------------------------------------------------
create or replace function public.survey_answer(
  p_token   text,
  p_item_id uuid,
  p_owner   text,
  p_note    text default null,
  p_ip      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id     uuid;
  v_frozen boolean;
  v_note   text;
begin
  if p_token is null or length(p_token) <> 32 or p_item_id is null then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  select r.id, r.is_frozen
    into v_id, v_frozen
  from public.survey_respondents r
  where r.token = p_token
    and r.is_active
  limit 1;

  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  if v_frozen then
    return jsonb_build_object('ok', false, 'reason', 'frozen');
  end if;

  -- The item must be one currently in the survey. Answering a deactivated or
  -- deleted item would put a row in the record that nobody was ever shown.
  if not exists (
    select 1
    from public.survey_items i
    where i.id = p_item_id
      and i.is_active = true
      and i.deleted_at is null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'unknown_item');
  end if;

  -- An empty or whitespace-only note is stored as NULL rather than '', so
  -- "left a note" stays a meaningful thing to test for.
  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null then
    v_note := left(v_note, 2000);
  end if;

  insert into public.survey_responses (item_id, respondent_id, owner, note, ip)
  values (p_item_id, v_id, p_owner, v_note, left(p_ip, 100));

  return jsonb_build_object('ok', true);

exception
  -- A bad `owner` trips the CHECK constraint on survey_responses. Catching it
  -- here keeps that constraint the single source of truth for the valid names
  -- while still giving the browser a clean answer instead of an error.
  when check_violation then
    return jsonb_build_object('ok', false, 'reason', 'bad_owner');
end;
$$;


-- ---------------------------------------------------------------------------
-- survey_progress — "12 of 34 answered"
-- ---------------------------------------------------------------------------
-- Counts only ACTIVE items, so deactivating an item cannot leave someone
-- stranded at 33 of 34 with nothing left to answer.
-- ---------------------------------------------------------------------------
create or replace function public.survey_progress(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id       uuid;
  v_total    integer;
  v_answered integer;
begin
  if p_token is null or length(p_token) <> 32 then
    return null;
  end if;

  select r.id into v_id
  from public.survey_respondents r
  where r.token = p_token
    and r.is_active
  limit 1;

  if v_id is null then
    return null;
  end if;

  select count(*) into v_total
  from public.survey_items i
  where i.is_active = true
    and i.deleted_at is null;

  select count(distinct r.item_id) into v_answered
  from public.survey_responses r
  join public.survey_items i on i.id = r.item_id
  where r.respondent_id = v_id
    and i.is_active = true
    and i.deleted_at is null;

  return jsonb_build_object('answered', v_answered, 'total', v_total);
end;
$$;


-- ---------------------------------------------------------------------------
-- Grant execute deliberately, rather than letting it happen by default.
-- ---------------------------------------------------------------------------
revoke all on function public.survey_open(text, text, text)             from public;
revoke all on function public.survey_load(text, text, text)             from public;
revoke all on function public.survey_answer(text, uuid, text, text, text) from public;
revoke all on function public.survey_progress(text)                     from public;

grant execute on function public.survey_open(text, text, text)             to anon, authenticated;
grant execute on function public.survey_load(text, text, text)             to anon, authenticated;
grant execute on function public.survey_answer(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.survey_progress(text)                     to anon, authenticated;


-- ============================================================================
-- STORAGE — survey-images
-- ----------------------------------------------------------------------------
-- Separate from equipment-images so cleanup is one bucket deletion when the
-- survey is over. Public read, same as the rest of the site: anything in here
-- is readable by URL, so don't put anything in it you wouldn't put on the
-- public site.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('survey-images', 'survey-images', true)
on conflict (id) do nothing;

drop policy if exists "public views survey images" on storage.objects;
create policy "public views survey images"
  on storage.objects for select
  to public
  using (bucket_id = 'survey-images');

drop policy if exists "owner uploads survey images" on storage.objects;
create policy "owner uploads survey images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'survey-images');

drop policy if exists "owner updates survey images" on storage.objects;
create policy "owner updates survey images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'survey-images');

drop policy if exists "owner deletes survey images" on storage.objects;
create policy "owner deletes survey images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'survey-images');
