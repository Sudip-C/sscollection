update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin"}'::jsonb
where id = '0dba7a5e-efda-4525-8995-b1f7f4c6d3d1'
  and email_confirmed_at is not null
returning
  id,
  email,
  raw_app_meta_data ->> 'role' as app_role;