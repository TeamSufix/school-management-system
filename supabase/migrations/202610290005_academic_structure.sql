begin;

create table public.academic_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null check (name ~ '^[0-9]{4}/[0-9]{4}$'),
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, name),
  check (starts_on is null or ends_on is null or starts_on < ends_on)
);

create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  session_id uuid not null references public.academic_sessions(id) on delete cascade,
  name text not null check (name in ('term_1', 'term_2', 'term_3')),
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, name),
  check (starts_on is null or ends_on is null or starts_on < ends_on)
);

create table public.streams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 50),
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

alter table public.students
  add column stream_id uuid references public.streams(id) on delete set null;

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  session_id uuid not null references public.academic_sessions(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  stream_id uuid references public.streams(id) on delete set null,
  enrolled_on date not null default current_date,
  left_on date,
  created_at timestamptz not null default now()
);

create unique index idx_enrollments_one_current on public.enrollments(student_id, session_id) where left_on is null;

create index idx_academic_terms_session on public.academic_terms(session_id);
create index idx_streams_class on public.streams(class_id);
create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_school on public.enrollments(school_id);

alter table public.academic_sessions enable row level security;
alter table public.academic_terms enable row level security;
alter table public.streams enable row level security;
alter table public.enrollments enable row level security;

create policy sessions_read on public.academic_sessions for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy sessions_read_guard on public.academic_sessions as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy sessions_write on public.academic_sessions for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy sessions_write_guard on public.academic_sessions as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));

create policy terms_read on public.academic_terms for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy terms_read_guard on public.academic_terms as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy terms_write on public.academic_terms for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy terms_write_guard on public.academic_terms as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));

create policy streams_read on public.streams for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy streams_read_guard on public.streams as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy streams_write on public.streams for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy streams_write_guard on public.streams as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));

create policy enrollments_read on public.enrollments for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant'])
    or exists (
      select 1 from public.student_parents sp
      where sp.student_id = enrollments.student_id and sp.parent_id = auth.uid()
    )
  );
create policy enrollments_read_guard on public.enrollments as restrictive for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant'])
    or exists (
      select 1 from public.student_parents sp
      where sp.student_id = enrollments.student_id and sp.parent_id = auth.uid()
    )
  );
create policy enrollments_write on public.enrollments for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy enrollments_write_guard on public.enrollments as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));

create or replace function public.sms_current_session(target_school uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select id from public.academic_sessions where school_id = target_school and is_current limit 1 $$;

revoke all on function public.sms_current_session(uuid) from public, anon;
grant execute on function public.sms_current_session(uuid) to authenticated;

commit;
