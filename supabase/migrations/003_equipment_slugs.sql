-- ============================================================================
-- Give each piece of equipment its own URL-safe slug
-- ----------------------------------------------------------------------------
-- So a listing can live at /equipment/john-deere-4020 instead of
-- /equipment/8f3a1c2e-... — readable for people, far better for search.
-- ============================================================================

alter table public.equipment
  add column if not exists slug text;


-- Turn "John Deere 4020 Tractor!" into "john-deere-4020-tractor"
create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;


-- Backfill existing rows. Appends -2, -3 ... if two machines share a name,
-- so nothing collides.
with numbered as (
  select
    id,
    public.slugify(name) as base,
    row_number() over (
      partition by public.slugify(name)
      order by created_at
    ) as n
  from public.equipment
  where slug is null or slug = ''
)
update public.equipment e
set slug = case
             when n = 1 then numbered.base
             else numbered.base || '-' || n
           end
from numbered
where e.id = numbered.id
  and numbered.base <> '';


-- Anything still without a slug (blank name) falls back to its id
update public.equipment
set slug = 'item-' || left(id::text, 8)
where slug is null or slug = '';


alter table public.equipment
  alter column slug set not null;

create unique index if not exists equipment_slug_key
  on public.equipment (slug);
