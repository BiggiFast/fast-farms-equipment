-- ============================================================================
-- MrCoryFast — Projects & Updates
-- ----------------------------------------------------------------------------
-- A "project" is something ongoing: Rebuilding the shop, Learning web design.
-- An "update" is a single entry: a photo, a finding, a note from the road.
--
-- An update MAY belong to a project (project_id), or stand alone (project_id
-- is NULL). The main feed shows all published updates newest-first; a project
-- page collects only its own. That keeps quick one-off thoughts possible
-- without forcing every idea into a project.
--
-- Conventions follow the existing `equipment` table: jsonb photo arrays,
-- soft delete via deleted_at, RLS with public read / authenticated write.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- PROJECTS
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),

  title        text not null,
  -- URL-safe name: "rebuilding-the-shop" -> /projects/rebuilding-the-shop
  slug         text not null unique,
  -- Short blurb shown on feed cards and project lists
  summary      text,
  -- Longer "what is this project" text shown at the top of the project page
  body         text,

  -- [{ "url": "...", "is_main": true, "sort_order": 0 }]
  photos       jsonb not null default '[]'::jsonb,

  -- active | completed | paused — lets the site show "what I'm working on now"
  status       text not null default 'active'
                 check (status in ('active', 'completed', 'paused')),

  -- Drafts: write it on your phone, publish when you're ready
  is_published boolean not null default false,

  started_at   date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);


-- ---------------------------------------------------------------------------
-- UPDATES
-- ---------------------------------------------------------------------------
create table if not exists public.updates (
  id           uuid primary key default gen_random_uuid(),

  -- NULL = a standalone update that belongs to no project.
  -- on delete set null: removing a project keeps its updates in the feed
  -- rather than silently destroying them.
  project_id   uuid references public.projects(id) on delete set null,

  -- Optional. A daily log entry often doesn't need a headline.
  title        text,
  body         text,

  photos       jsonb not null default '[]'::jsonb,

  is_published boolean not null default false,
  -- When it appeared publicly. Distinct from created_at so a draft written
  -- Tuesday and published Friday sorts by Friday.
  published_at timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);


-- ---------------------------------------------------------------------------
-- INDEXES — the three queries the site actually runs
-- ---------------------------------------------------------------------------

-- The main feed: published updates, newest first
create index if not exists updates_feed_idx
  on public.updates (published_at desc)
  where is_published = true and deleted_at is null;

-- A project's own updates
create index if not exists updates_project_idx
  on public.updates (project_id, published_at desc)
  where deleted_at is null;

-- The projects list
create index if not exists projects_published_idx
  on public.projects (created_at desc)
  where is_published = true and deleted_at is null;

-- Slug lookup for /projects/[slug]
create index if not exists projects_slug_idx
  on public.projects (slug)
  where deleted_at is null;


-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists updates_touch_updated_at on public.updates;
create trigger updates_touch_updated_at
  before update on public.updates
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Anyone may read PUBLISHED, non-deleted rows.
-- Only an authenticated user (you) may write anything, or see drafts.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.updates  enable row level security;

-- Public read: published only
drop policy if exists "public reads published projects" on public.projects;
create policy "public reads published projects"
  on public.projects for select
  to anon
  using (is_published = true and deleted_at is null);

drop policy if exists "public reads published updates" on public.updates;
create policy "public reads published updates"
  on public.updates for select
  to anon
  using (is_published = true and deleted_at is null);

-- Authenticated (you): full access, drafts included
drop policy if exists "owner manages projects" on public.projects;
create policy "owner manages projects"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "owner manages updates" on public.updates;
create policy "owner manages updates"
  on public.updates for all
  to authenticated
  using (true)
  with check (true);
