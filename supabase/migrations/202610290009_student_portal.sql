begin;

-- Student login accounts ----------------------------------------------------

do $$
declare constraint_name text;
begin
  for constraint_name in
    select conname from pg_constraint
    where conrelid = 'public.school_memberships'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.school_memberships drop constraint %I', constraint_name);
  end loop;
end;
$$;

alter table public.school_memberships
  add constraint school_memberships_role_check
    check (role in ('school_admin', 'teacher', 'accountant', 'parent', 'student'));

alter table public.students
  add column user_id uuid references public.profiles(id) on delete set null;

create unique index idx_students_user_id on public.students(user_id) where user_id is not null;

-- Online assessments: questions, due dates and submissions -------------------

alter table public.assessments
  add column due_at timestamptz,
  add column instructions text check (instructions is null or length(instructions) <= 5000);

create table public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  sort_order integer not null check (sort_order > 0),
  prompt text not null check (length(btrim(prompt)) between 1 and 2000),
  question_type text not null check (question_type in ('multiple_choice', 'short_answer')),
  options jsonb not null default '[]'::jsonb
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 10),
  correct_option smallint check (correct_option is null or correct_option between 0 and 9),
  points numeric(6,2) not null default 1 check (points > 0 and points <= 1000),
  unique (assessment_id, sort_order),
  check (question_type = 'short_answer' or (correct_option is not null and jsonb_array_length(options) >= 2))
);

create table public.assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  score numeric(6,2) check (score is null or score >= 0),
  status text not null default 'submitted' check (status in ('submitted', 'graded')),
  submitted_at timestamptz not null default now(),
  graded_by uuid references public.profiles(id),
  graded_at timestamptz,
  feedback text check (feedback is null or length(feedback) <= 2000),
  unique (assessment_id, student_id)
);

create index idx_assessment_questions_assessment on public.assessment_questions(assessment_id);
create index idx_assessment_submissions_assessment on public.assessment_submissions(assessment_id);
create index idx_assessment_submissions_student on public.assessment_submissions(student_id);

alter table public.assessment_questions enable row level security;
alter table public.assessment_submissions enable row level security;

-- Student self-access helpers ------------------------------------------------

create function public.sms_is_self_student(target_school uuid, target_student uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.students st
    join public.school_memberships sm on sm.user_id = st.user_id and sm.school_id = st.school_id
    join public.schools s on s.id = st.school_id
    where st.id = target_student
      and st.school_id = target_school
      and st.user_id = auth.uid()
      and sm.role = 'student'
      and s.status = 'active'
  );
$$;

create function public.sms_self_in_class(target_school uuid, target_class uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.students st
    where st.user_id = auth.uid()
      and st.school_id = target_school
      and st.class_id = target_class
  );
$$;

-- Returns assessment questions to students without the correct answers.
create function public.sms_assessment_questions(target_assessment uuid)
returns table (
  id uuid,
  sort_order integer,
  prompt text,
  question_type text,
  options jsonb,
  points numeric
)
language sql stable security definer set search_path = ''
as $$
  select q.id, q.sort_order, q.prompt, q.question_type, q.options, q.points
  from public.assessment_questions q
  join public.assessments a on a.id = q.assessment_id
  where q.assessment_id = target_assessment
    and public.sms_self_in_class(a.school_id, a.class_id)
  order by q.sort_order;
$$;

revoke all on function public.sms_is_self_student(uuid, uuid) from public, anon;
revoke all on function public.sms_self_in_class(uuid, uuid) from public, anon;
revoke all on function public.sms_assessment_questions(uuid) from public, anon;
grant execute on function public.sms_is_self_student(uuid, uuid) to authenticated;
grant execute on function public.sms_self_in_class(uuid, uuid) to authenticated;
grant execute on function public.sms_assessment_questions(uuid) to authenticated;

-- Auto-grading: multiple-choice questions grade themselves; the submission is
-- graded automatically only when no written questions remain for the teacher.
create function public.sms_prepare_submission()
returns trigger language plpgsql set search_path = ''
as $$
declare
  assessment record;
  question record;
  auto_score numeric := 0;
  needs_review boolean := false;
begin
  select a.school_id, a.class_id into assessment from public.assessments a where a.id = new.assessment_id;
  if not found or assessment.school_id <> new.school_id then
    raise exception 'Submission does not match the assessment';
  end if;
  if tg_op = 'INSERT' then
    if new.submitted_by is distinct from auth.uid() then
      raise exception 'Submission actor must be the authenticated student' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.students st
      where st.id = new.student_id and st.school_id = new.school_id
        and st.class_id = assessment.class_id and st.user_id = auth.uid()
    ) then
      raise exception 'Only the student enrolled in this class can submit' using errcode = '42501';
    end if;
    new.submitted_at = clock_timestamp();
  end if;
  if new.status = 'graded' and new.score is null then
    raise exception 'A graded submission requires a score';
  end if;
  if tg_op = 'INSERT' then
    for question in
      select q.id, q.question_type, q.correct_option, q.points
      from public.assessment_questions q where q.assessment_id = new.assessment_id
    loop
      if question.question_type = 'multiple_choice' then
        if coalesce(new.answers ->> question.id::text, '') = question.correct_option::text then
          auto_score = auto_score + question.points;
        end if;
      else
        needs_review = true;
      end if;
    end loop;
    if not needs_review and exists (select 1 from public.assessment_questions q where q.assessment_id = new.assessment_id) then
      new.score = auto_score;
      new.status = 'graded';
      new.graded_at = clock_timestamp();
    else
      new.score = null;
      new.status = 'submitted';
    end if;
  end if;
  return new;
end;
$$;

create trigger assessment_submissions_prepare before insert or update on public.assessment_submissions
  for each row execute function public.sms_prepare_submission();

-- Graded submissions flow into assessment_scores for reports.
create function public.sms_sync_submission_score()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'graded' and new.score is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'graded' or old.score is distinct from new.score) then
    insert into public.assessment_scores (school_id, assessment_id, student_id, score, recorded_by)
    values (new.school_id, new.assessment_id, new.student_id, new.score, coalesce(new.graded_by, new.submitted_by))
    on conflict (assessment_id, student_id)
    do update set score = excluded.score, recorded_by = excluded.recorded_by, updated_at = now();
  end if;
  return new;
end;
$$;

create trigger assessment_submissions_sync_score after insert or update on public.assessment_submissions
  for each row execute function public.sms_sync_submission_score();

-- Questions: staff manage them; students read them only through
-- sms_assessment_questions (which hides correct_option).
create policy questions_read on public.assessment_questions for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant']));
create policy questions_read_guard on public.assessment_questions as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant']));
create policy questions_write on public.assessment_questions for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']))
  with check (
    public.sms_has_school_role(school_id, array['school_admin', 'teacher'])
    and exists (
      select 1 from public.assessments a
      where a.id = assessment_id and a.school_id = assessment_questions.school_id
        and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)
    )
  );
create policy questions_write_guard on public.assessment_questions as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']))
  with check (public.sms_has_school_role(school_id, array['school_admin', 'teacher']));

-- Submissions: students create their own; staff within assessment scope review.
create policy submissions_read on public.assessment_submissions for select to authenticated
  using (
    public.sms_is_self_student(school_id, student_id)
    or public.sms_has_school_role(school_id, array['school_admin', 'accountant'])
    or exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)
    )
    or exists (
      select 1 from public.student_parents sp
      where sp.student_id = assessment_submissions.student_id and sp.parent_id = auth.uid()
    )
  );
create policy submissions_read_guard on public.assessment_submissions as restrictive for select to authenticated
  using (
    public.sms_is_self_student(school_id, student_id)
    or public.sms_has_school_role(school_id, array['school_admin', 'accountant'])
    or exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)
    )
    or exists (
      select 1 from public.student_parents sp
      where sp.student_id = assessment_submissions.student_id and sp.parent_id = auth.uid()
    )
  );
create policy submissions_insert on public.assessment_submissions for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and status = 'submitted'
    and public.sms_is_self_student(school_id, student_id)
    and exists (
      select 1 from public.assessments a
      join public.students st on st.id = assessment_submissions.student_id and st.class_id = a.class_id
      where a.id = assessment_id and a.school_id = assessment_submissions.school_id
        and (a.due_at is null or a.due_at >= now())
    )
  );
create policy submissions_insert_guard on public.assessment_submissions as restrictive for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and public.sms_is_self_student(school_id, student_id)
  );
create policy submissions_grade on public.assessment_submissions for update to authenticated
  using (exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)))
  with check (
    status = 'graded'
    and graded_by = auth.uid()
    and exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id))
  );
create policy submissions_grade_guard on public.assessment_submissions as restrictive for update to authenticated
  using (exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)))
  with check (exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)));
create policy submissions_no_delete on public.assessment_submissions as restrictive for delete to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']));

-- Students gain self read access on their own school records. The existing
-- guards are restrictive, so they are recreated with the self-student clause.
drop policy sms_student_read_guard on public.students;
create policy sms_student_read_guard on public.students as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant']) or public.sms_is_linked_parent(school_id, id) or user_id = auth.uid());

drop policy sms_attendance_read_guard on public.attendance;
create policy sms_attendance_read_guard on public.attendance as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']) or public.sms_is_linked_parent(school_id, student_id) or public.sms_is_self_student(school_id, student_id));

drop policy sms_result_read_guard on public.results;
create policy sms_result_read_guard on public.results as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']) or public.sms_is_linked_parent(school_id, student_id) or public.sms_is_self_student(school_id, student_id));

drop policy sms_fee_read_guard on public.fees;
create policy sms_fee_read_guard on public.fees as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'accountant']) or public.sms_is_linked_parent(school_id, student_id) or public.sms_is_self_student(school_id, student_id));

drop policy sms_payment_read_guard on public.payments;
create policy sms_payment_read_guard on public.payments as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'accountant']) or public.sms_is_linked_parent(school_id, student_id) or public.sms_is_self_student(school_id, student_id));

drop policy sms_school_read_guard on public.schools;
create policy sms_school_read_guard on public.schools as restrictive for select to authenticated
  using (public.sms_has_school_role(id, array['school_admin', 'teacher', 'accountant', 'parent', 'student']));

drop policy sms_catalog_read_guard on public.classes;
create policy sms_catalog_read_guard on public.classes as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent', 'student']));

drop policy sms_catalog_read_guard on public.subjects;
create policy sms_catalog_read_guard on public.subjects as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent', 'student']));

-- Students see their own class's assessments, scores, enrolment and timetable.
drop policy assessments_read on public.assessments;
create policy assessments_read on public.assessments for select to authenticated
  using (
    public.sms_assessment_scope(school_id, class_id, subject_id)
    or public.sms_has_school_role(school_id, array['accountant'])
    or public.sms_self_in_class(school_id, class_id)
    or exists (
      select 1 from public.students s
      join public.student_parents sp on sp.student_id = s.id and sp.parent_id = auth.uid()
      where s.school_id = assessments.school_id and s.class_id = assessments.class_id
    )
  );
drop policy assessments_read_guard on public.assessments;
create policy assessments_read_guard on public.assessments as restrictive for select to authenticated
  using (
    public.sms_assessment_scope(school_id, class_id, subject_id)
    or public.sms_has_school_role(school_id, array['accountant'])
    or public.sms_self_in_class(school_id, class_id)
    or exists (
      select 1 from public.students s
      join public.student_parents sp on sp.student_id = s.id and sp.parent_id = auth.uid()
      where s.school_id = assessments.school_id and s.class_id = assessments.class_id
    )
  );

drop policy assessment_scores_read on public.assessment_scores;
create policy assessment_scores_read on public.assessment_scores for select to authenticated
  using (
    exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id))
    or public.sms_is_self_student(school_id, student_id)
    or exists (select 1 from public.student_parents sp where sp.student_id = assessment_scores.student_id and sp.parent_id = auth.uid())
  );
drop policy assessment_scores_read_guard on public.assessment_scores;
create policy assessment_scores_read_guard on public.assessment_scores as restrictive for select to authenticated
  using (
    exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id))
    or public.sms_is_self_student(school_id, student_id)
    or exists (select 1 from public.student_parents sp where sp.student_id = assessment_scores.student_id and sp.parent_id = auth.uid())
  );

drop policy timetable_read on public.timetable_entries;
create policy timetable_read on public.timetable_entries for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'accountant'])
    or (public.sms_has_school_role(school_id, array['teacher']) and public.sms_teacher_assigned(school_id, class_id))
    or public.sms_self_in_class(school_id, class_id)
    or exists (
      select 1 from public.students s
      join public.student_parents sp on sp.student_id = s.id and sp.parent_id = auth.uid()
      where s.school_id = timetable_entries.school_id and s.class_id = timetable_entries.class_id
    )
  );
drop policy timetable_read_guard on public.timetable_entries;
create policy timetable_read_guard on public.timetable_entries as restrictive for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'accountant'])
    or (public.sms_has_school_role(school_id, array['teacher']) and public.sms_teacher_assigned(school_id, class_id))
    or public.sms_self_in_class(school_id, class_id)
    or exists (
      select 1 from public.students s
      join public.student_parents sp on sp.student_id = s.id and sp.parent_id = auth.uid()
      where s.school_id = timetable_entries.school_id and s.class_id = timetable_entries.class_id
    )
  );

-- Announcements can target students.
alter table public.announcements
  drop constraint announcements_audience_check,
  add constraint announcements_audience_check
    check (audience in ('all', 'staff', 'teachers', 'parents', 'students'));

create or replace function public.sms_announcement_visible(target_school uuid, target_audience text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case target_audience
    when 'all' then public.sms_has_school_role(target_school, array['school_admin', 'teacher', 'accountant', 'parent', 'student'])
    when 'staff' then public.sms_has_school_role(target_school, array['school_admin', 'teacher', 'accountant'])
    when 'teachers' then public.sms_has_school_role(target_school, array['school_admin', 'teacher'])
    when 'parents' then public.sms_has_school_role(target_school, array['school_admin', 'parent'])
    when 'students' then public.sms_has_school_role(target_school, array['school_admin', 'student'])
    else false
  end;
$$;

commit;
