begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/webp', 'image/jpeg', 'image/png']
);

create policy "Admins can manage product images"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'product-images'
    and (
      (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
    )
  )
  with check (
    bucket_id = 'product-images'
    and (
      (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
    )
  );

commit;

select
  id,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'product-images';