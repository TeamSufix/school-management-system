begin;

create unique index teachers_school_login_unique on public.teachers (school_id, user_id) where user_id is not null;
create unique index fees_canonical_period_unique on public.fees (school_id, student_id, replace(btrim(academic_year), '-', '/'), term);
create unique index results_canonical_period_unique on public.results (school_id, student_id, subject_id, replace(btrim(academic_year), '-', '/'), term);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, class_id, subject_id)
);

create index teacher_assignments_scope_idx on public.teacher_assignments (school_id, teacher_id);

create table public.school_academic_settings (
  school_id uuid primary key references public.schools(id) on delete cascade,
  academic_year text not null check (academic_year ~ '^[0-9]{4}/[0-9]{4}$'),
  term text not null check (term in ('term_1', 'term_2', 'term_3')),
  updated_at timestamptz not null default now(),
  check (substring(academic_year from 6 for 4)::integer = substring(academic_year from 1 for 4)::integer + 1)
);

alter table public.teacher_assignments enable row level security;
alter table public.school_academic_settings enable row level security;
grant select, insert, update, delete on public.teacher_assignments to authenticated;
grant select, insert, update on public.school_academic_settings to authenticated;
grant select, insert, update, delete on public.teacher_assignments, public.school_academic_settings to service_role;

create function public.sms_teacher_assigned(target_school uuid, target_class uuid, target_subject uuid default null)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.teacher_assignments a
    join public.teachers t on t.id = a.teacher_id and t.school_id = a.school_id
    join public.school_memberships m on m.user_id = t.user_id and m.school_id = a.school_id
    join public.schools s on s.id = a.school_id
    where t.user_id = auth.uid() and t.status = 'active'
      and m.role = 'teacher' and s.status = 'active'
      and a.school_id = target_school
      and (target_class is null or a.class_id = target_class)
      and (target_subject is null or a.subject_id = target_subject)
  );
$$;

revoke all on function public.sms_teacher_assigned(uuid, uuid, uuid) from public, anon;
grant execute on function public.sms_teacher_assigned(uuid, uuid, uuid) to authenticated;

create function public.sms_teacher_assignable(target_school uuid, target_teacher uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.sms_has_school_role(target_school, array['school_admin']) and exists (
    select 1 from public.teachers t
    join public.school_memberships m on m.user_id = t.user_id and m.school_id = t.school_id
    where t.id = target_teacher and t.school_id = target_school and m.role = 'teacher' and t.status = 'active'
  );
$$;
revoke all on function public.sms_teacher_assignable(uuid, uuid) from public, anon;
grant execute on function public.sms_teacher_assignable(uuid, uuid) to authenticated;

create policy assignment_read on public.teacher_assignments for select to authenticated
using (
  public.sms_has_school_role(school_id, array['school_admin']) or exists (
    select 1 from public.teachers t where t.id = teacher_id and t.user_id = auth.uid() and t.status = 'active'
      and public.sms_has_school_role(t.school_id, array['teacher'])
  )
);
create policy assignment_manage on public.teacher_assignments for all to authenticated
using (public.sms_has_school_role(school_id, array['school_admin']))
with check (
  public.sms_has_school_role(school_id, array['school_admin'])
  and public.sms_teacher_assignable(school_id, teacher_id)
  and exists (select 1 from public.classes c where c.id = class_id and c.school_id = teacher_assignments.school_id)
  and exists (select 1 from public.subjects s where s.id = subject_id and s.school_id = teacher_assignments.school_id)
);

create policy academic_settings_read on public.school_academic_settings for select to authenticated
using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy academic_settings_insert on public.school_academic_settings for insert to authenticated
with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy academic_settings_update on public.school_academic_settings for update to authenticated
using (public.sms_has_school_role(school_id, array['school_admin']))
with check (public.sms_has_school_role(school_id, array['school_admin']));

create policy teacher_identity_scope on public.teachers as restrictive for select to authenticated
using (public.sms_has_school_role(school_id, array['school_admin']) or user_id = auth.uid());

create policy teacher_class_scope on public.classes as restrictive for select to authenticated
using (not public.sms_has_school_role(school_id, array['teacher']) or public.sms_has_school_role(school_id, array['school_admin']) or public.sms_teacher_assigned(school_id, id));
create policy teacher_subject_scope on public.subjects as restrictive for select to authenticated
using (not public.sms_has_school_role(school_id, array['teacher']) or public.sms_has_school_role(school_id, array['school_admin']) or public.sms_teacher_assigned(school_id, null, id));
create policy teacher_student_scope on public.students as restrictive for select to authenticated
using (not public.sms_has_school_role(school_id, array['teacher']) or public.sms_has_school_role(school_id, array['school_admin']) or (class_id is not null and public.sms_teacher_assigned(school_id, class_id)));

create policy teacher_attendance_scope on public.attendance as restrictive for all to authenticated
using (not public.sms_has_school_role(school_id, array['teacher']) or public.sms_has_school_role(school_id, array['school_admin']) or public.sms_teacher_assigned(school_id, class_id))
with check (not public.sms_has_school_role(school_id, array['teacher']) or public.sms_has_school_role(school_id, array['school_admin']) or public.sms_teacher_assigned(school_id, class_id));
create policy teacher_result_scope on public.results as restrictive for all to authenticated
using (not public.sms_has_school_role(school_id, array['teacher']) or public.sms_has_school_role(school_id, array['school_admin']) or public.sms_teacher_assigned(school_id, class_id, subject_id))
with check (not public.sms_has_school_role(school_id, array['teacher']) or public.sms_has_school_role(school_id, array['school_admin']) or public.sms_teacher_assigned(school_id, class_id, subject_id));
create policy teacher_amendment_scope on public.result_amendments as restrictive for select to authenticated
using (not public.sms_has_school_role(school_id, array['teacher']) or public.sms_has_school_role(school_id, array['school_admin']) or exists (select 1 from public.results r where r.id = result_id and r.school_id = result_amendments.school_id));

commit;
