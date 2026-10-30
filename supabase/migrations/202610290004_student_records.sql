begin;

alter table public.students
  add column admission_date date,
  add column guardian_name text check (guardian_name is null or length(btrim(guardian_name)) between 1 and 200),
  add column guardian_relationship text check (guardian_relationship is null or length(btrim(guardian_relationship)) between 1 and 100),
  add column guardian_phone text check (guardian_phone is null or length(guardian_phone) <= 40),
  add column guardian_email text check (guardian_email is null or (length(guardian_email) <= 254 and guardian_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  add column photo_path text check (photo_path is null or (split_part(photo_path, '/', 1) = school_id::text and split_part(photo_path, '/', 2) = 'students'));

create table public.student_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  file_name text not null check (length(btrim(file_name)) between 1 and 200),
  file_path text not null unique check (split_part(file_path, '/', 1) = school_id::text and split_part(file_path, '/', 2) = 'students'),
  description text check (description is null or length(description) <= 1000),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_student_documents_student on public.student_documents(student_id);
create index idx_student_documents_school on public.student_documents(school_id);

alter table public.student_documents enable row level security;

create policy student_documents_read on public.student_documents for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant']));
create policy student_documents_read_guard on public.student_documents as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant']));
create policy student_documents_insert on public.student_documents for insert to authenticated
  with check (public.sms_has_school_role(school_id, array['school_admin']) and uploaded_by = auth.uid());
create policy student_documents_insert_guard on public.student_documents as restrictive for insert to authenticated
  with check (public.sms_has_school_role(school_id, array['school_admin']) and uploaded_by = auth.uid());
create policy student_documents_delete on public.student_documents for delete to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']));
create policy student_documents_delete_guard on public.student_documents as restrictive for delete to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']));

do $$
begin
  if exists (
    select 1 from storage.buckets where id = 'schoolms-records'
      and (public is distinct from false or file_size_limit is distinct from 5242880 or allowed_mime_types is distinct from array['image/png', 'image/jpeg', 'application/pdf']::text[])
  ) then
    raise exception 'Existing schoolms-records bucket configuration differs; review it before applying this migration';
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('schoolms-records', 'schoolms-records', false, 5242880, array['image/png', 'image/jpeg', 'application/pdf'])
on conflict (id) do nothing;

create function public.sms_record_access(object_name text, manage boolean default false)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare school text;
begin
  if auth.uid() is null or object_name is null then return false; end if;
  school = split_part(object_name, '/', 1);
  if school !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  if split_part(object_name, '/', 2) <> 'students' then return false; end if;
  return public.sms_has_school_role(school::uuid, case when manage then array['school_admin'] else array['school_admin', 'teacher', 'accountant'] end);
end;
$$;

revoke all on function public.sms_record_access(text, boolean) from public;
grant execute on function public.sms_record_access(text, boolean) to anon, authenticated;

create policy records_read on storage.objects for select to authenticated
using (bucket_id = 'schoolms-records' and public.sms_record_access(name, false));
create policy records_read_guard on storage.objects as restrictive for select to anon, authenticated
using (bucket_id <> 'schoolms-records' or public.sms_record_access(name, false));
create policy records_insert on storage.objects for insert to authenticated
with check (bucket_id = 'schoolms-records' and public.sms_record_access(name, true));
create policy records_insert_guard on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id <> 'schoolms-records' or public.sms_record_access(name, true));
create policy records_update on storage.objects for update to authenticated
using (bucket_id = 'schoolms-records' and public.sms_record_access(name, true))
with check (bucket_id = 'schoolms-records' and public.sms_record_access(name, true));
create policy records_update_guard on storage.objects as restrictive for update to anon, authenticated
using (bucket_id <> 'schoolms-records' or public.sms_record_access(name, true));
create policy records_delete on storage.objects for delete to authenticated
using (bucket_id = 'schoolms-records' and public.sms_record_access(name, true));
create policy records_delete_guard on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'schoolms-records' or public.sms_record_access(name, true));

commit;
