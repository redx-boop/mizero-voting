-- MIZERO AWARDS — category image storage upgrade
-- Run this non-destructive script once in the Supabase SQL Editor for an
-- existing project. It creates a public bucket and limits writes to admins.

insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do nothing;

drop policy if exists "category images are publicly readable" on storage.objects;
create policy "category images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'category-images');

drop policy if exists "admins can upload category images" on storage.objects;
create policy "admins can upload category images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'category-images' and public.is_admin());

drop policy if exists "admins can update category images" on storage.objects;
create policy "admins can update category images"
  on storage.objects for update to authenticated
  using (bucket_id = 'category-images' and public.is_admin());

drop policy if exists "admins can delete category images" on storage.objects;
create policy "admins can delete category images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'category-images' and public.is_admin());
