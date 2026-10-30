begin;

-- Report-card remarks written by the class teacher and head teacher per term.

create table public.student_term_remarks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year text not null,
  term text not null check (term in ('term_1', 'term_2', 'term_3')),
  class_teacher_remark text check (class_teacher_remark is null or length(class_teacher_remark) <= 1000),
  head_teacher_remark text check (head_teacher_remark is null or length(head_teacher_remark) <= 1000),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year, term)
);

create index idx_student_term_remarks_school on public.student_term_remarks(school_id, academic_year, term);

alter table public.student_term_remarks enable row level security;

create policy remarks_read on public.student_term_remarks for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant'])
    or public.sms_is_linked_parent(school_id, student_id)
    or public.sms_is_self_student(school_id, student_id)
  );
create policy remarks_read_guard on public.student_term_remarks as restrictive for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant'])
    or public.sms_is_linked_parent(school_id, student_id)
    or public.sms_is_self_student(school_id, student_id)
  );
create policy remarks_write on public.student_term_remarks for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']))
  with check (
    public.sms_has_school_role(school_id, array['school_admin', 'teacher'])
    and updated_by = auth.uid()
    and exists (select 1 from public.students st where st.id = student_term_remarks.student_id and st.school_id = student_term_remarks.school_id)
  );
create policy remarks_write_guard on public.student_term_remarks as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']))
  with check (public.sms_has_school_role(school_id, array['school_admin', 'teacher']));

commit;
