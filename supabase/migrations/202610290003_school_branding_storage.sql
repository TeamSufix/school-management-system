begin;

do $$
begin
  if exists (
    select 1 from storage.buckets where id = 'schoolms-branding'
      and (public is distinct from false or file_size_limit is distinct from 524288 or allowed_mime_types is distinct from array['image/png', 'image/jpeg']::text[])
  ) then
    raise exception 'Existing schoolms-branding bucket configuration differs; review it before applying this migration';
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('schoolms-branding', 'schoolms-branding', false, 524288, array['image/png', 'image/jpeg'])
on conflict (id) do nothing;

create function public.sms_branding_access(object_name text, manage boolean default false)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare school text;
begin
  if auth.uid() is null or object_name is null then return false; end if;
  school = split_part(object_name, '/', 1);
  if school !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  if split_part(object_name, '/', 2) <> 'logos' then return false; end if;
  return public.sms_has_school_role(school::uuid, case when manage then array['school_admin'] else array['school_admin', 'teacher', 'accountant', 'parent'] end);
end;
$$;

revoke all on function public.sms_branding_access(text, boolean) from public;
grant execute on function public.sms_branding_access(text, boolean) to anon, authenticated;

create policy branding_read on storage.objects for select to authenticated
using (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, false));
create policy branding_read_guard on storage.objects as restrictive for select to anon, authenticated
using (bucket_id <> 'schoolms-branding' or public.sms_branding_access(name, false));
create policy branding_insert on storage.objects for insert to authenticated
with check (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, true));
create policy branding_insert_guard on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id <> 'schoolms-branding' or public.sms_branding_access(name, true));
create policy branding_update on storage.objects for update to authenticated
using (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, true))
with check (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, true));
create policy branding_update_guard on storage.objects as restrictive for update to anon, authenticated
using (bucket_id <> 'schoolms-branding' or public.sms_branding_access(name, true))
with check (bucket_id <> 'schoolms-branding' or public.sms_branding_access(name, true));
create policy branding_delete on storage.objects for delete to authenticated
using (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, true));
create policy branding_delete_guard on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'schoolms-branding' or public.sms_branding_access(name, true));

commit;
