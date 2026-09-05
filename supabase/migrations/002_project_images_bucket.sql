-- ============================================================================
-- Storage bucket for project & update photos
-- ----------------------------------------------------------------------------
-- Kept separate from `equipment-images` so the two sections of the site can
-- have different policies later without untangling one shared bucket.
--
-- Public read  = anyone can view a photo once it's on the site.
-- Authenticated write = only a signed-in user (you) can upload or remove.
-- ============================================================================

-- Create the bucket (public read). Safe to re-run.
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;


-- Anyone may view images in this bucket
drop policy if exists "public views project images" on storage.objects;
create policy "public views project images"
  on storage.objects for select
  to public
  using (bucket_id = 'project-images');


-- Only signed-in you may upload
drop policy if exists "owner uploads project images" on storage.objects;
create policy "owner uploads project images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images');


-- Only signed-in you may replace
drop policy if exists "owner updates project images" on storage.objects;
create policy "owner updates project images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images');


-- Only signed-in you may delete
drop policy if exists "owner deletes project images" on storage.objects;
create policy "owner deletes project images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images');
