begin;

alter table public.schools
  add column website text,
  add column school_type text not null default 'other',
  add column logo_path text,
  add constraint schools_website_valid check (website is null or website ~* '^https?://[^[:space:]]+$'),
  add constraint schools_type_valid check (school_type in ('nursery', 'primary', 'junior_high', 'senior_high', 'combined', 'other')),
  add constraint schools_logo_path_valid check (logo_path is null or (split_part(logo_path, '/', 1) = id::text and split_part(logo_path, '/', 2) = 'logos'));

create table public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  platform_name text not null default 'SchoolMS' check (length(btrim(platform_name)) between 1 and 100),
  support_email text check (support_email is null or length(support_email) <= 254),
  support_phone text check (support_phone is null or length(support_phone) <= 40),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (1);
alter table public.platform_settings enable row level security;
grant select (id, platform_name, support_email, support_phone) on public.platform_settings to anon;
grant select, insert, update on public.platform_settings to authenticated;
grant select, insert, update on public.platform_settings to service_role;
create policy platform_settings_read on public.platform_settings for select to anon, authenticated using (true);
create policy platform_settings_insert on public.platform_settings for insert to authenticated
with check (public.is_super_admin() and updated_by = auth.uid());
create policy platform_settings_update on public.platform_settings for update to authenticated
using (public.is_super_admin()) with check (public.is_super_admin() and updated_by = auth.uid());

commit;
