begin;

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  session_id uuid references public.academic_sessions(id) on delete set null,
  academic_year text not null,
  term text not null check (term in ('term_1', 'term_2', 'term_3')),
  name text not null check (length(btrim(name)) between 1 and 200),
  assessment_type text not null check (assessment_type in ('class_test', 'assignment', 'mid_term', 'end_of_term', 'exam')),
  weight numeric(5,2) not null check (weight > 0 and weight <= 100),
  max_score numeric(6,2) not null default 100 check (max_score > 0 and max_score <= 1000),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (class_id, subject_id, academic_year, term, name)
);

create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(6,2) not null check (score >= 0),
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create index idx_assessments_scope on public.assessments(school_id, class_id, subject_id, academic_year, term);
create index idx_assessment_scores_assessment on public.assessment_scores(assessment_id);
create index idx_assessment_scores_student on public.assessment_scores(student_id);

alter table public.assessments enable row level security;
alter table public.assessment_scores enable row level security;

create function public.sms_assessment_scope(target_school uuid, target_class uuid, target_subject uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.sms_has_school_role(target_school, array['school_admin'])
    or (public.sms_has_school_role(target_school, array['teacher']) and public.sms_teacher_assigned(target_school, target_class, target_subject));
$$;

revoke all on function public.sms_assessment_scope(uuid, uuid, uuid) from public, anon;
grant execute on function public.sms_assessment_scope(uuid, uuid, uuid) to authenticated;

create policy assessments_read on public.assessments for select to authenticated
  using (
    public.sms_assessment_scope(school_id, class_id, subject_id)
    or public.sms_has_school_role(school_id, array['accountant'])
    or exists (
      select 1 from public.students s
      join public.student_parents sp on sp.student_id = s.id and sp.parent_id = auth.uid()
      where s.school_id = assessments.school_id and s.class_id = assessments.class_id
    )
  );
create policy assessments_read_guard on public.assessments as restrictive for select to authenticated
  using (
    public.sms_assessment_scope(school_id, class_id, subject_id)
    or public.sms_has_school_role(school_id, array['accountant'])
    or exists (
      select 1 from public.students s
      join public.student_parents sp on sp.student_id = s.id and sp.parent_id = auth.uid()
      where s.school_id = assessments.school_id and s.class_id = assessments.class_id
    )
  );
create policy assessments_write on public.assessments for all to authenticated
  using (public.sms_assessment_scope(school_id, class_id, subject_id))
  with check (public.sms_assessment_scope(school_id, class_id, subject_id) and created_by = auth.uid());
create policy assessments_write_guard on public.assessments as restrictive for all to authenticated
  using (public.sms_assessment_scope(school_id, class_id, subject_id))
  with check (public.sms_assessment_scope(school_id, class_id, subject_id));

create policy assessment_scores_read on public.assessment_scores for select to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)
    )
    or exists (
      select 1 from public.student_parents sp
      where sp.student_id = assessment_scores.student_id and sp.parent_id = auth.uid()
    )
  );
create policy assessment_scores_read_guard on public.assessment_scores as restrictive for select to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)
    )
    or exists (
      select 1 from public.student_parents sp
      where sp.student_id = assessment_scores.student_id and sp.parent_id = auth.uid()
    )
  );
create policy assessment_scores_write on public.assessment_scores for all to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)
    )
  )
  with check (
    recorded_by = auth.uid()
    and exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)
    )
    and exists (
      select 1 from public.students s
      join public.assessments a on a.id = assessment_scores.assessment_id
      where s.id = assessment_scores.student_id and s.school_id = assessment_scores.school_id and s.class_id = a.class_id
    )
  );
create policy assessment_scores_write_guard on public.assessment_scores as restrictive for all to authenticated
  using (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)
    )
  )
  with check (
    exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)
    )
  );

create trigger assessment_scores_updated_at before update on public.assessment_scores
  for each row execute function public.update_updated_at_column();

create function public.sms_validate_assessment_score()
returns trigger language plpgsql set search_path = ''
as $$
declare assessment record;
begin
  if new.score::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Score must be a finite number';
  end if;
  select a.max_score, a.school_id, a.class_id into assessment from public.assessments a where a.id = new.assessment_id;
  if not found then raise exception 'Assessment does not exist'; end if;
  if assessment.school_id <> new.school_id then raise exception 'Score school does not match the assessment school'; end if;
  if new.score > assessment.max_score then raise exception 'Score exceeds the assessment maximum of %', assessment.max_score; end if;
  if not exists (select 1 from public.students s where s.id = new.student_id and s.school_id = new.school_id and s.class_id = assessment.class_id) then
    raise exception 'Student is not enrolled in the assessment class';
  end if;
  return new;
end;
$$;

create trigger assessment_scores_validate before insert or update on public.assessment_scores
  for each row execute function public.sms_validate_assessment_score();

commit;
