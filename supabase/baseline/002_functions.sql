-- Shared helper functions and triggers for the SchoolMS baseline.
-- Apply after 001_schema.sql on a fresh project.

begin;

create function public.update_updated_at_column()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
create trigger schools_updated_at before update on public.schools for each row execute function public.update_updated_at_column();
create trigger teachers_updated_at before update on public.teachers for each row execute function public.update_updated_at_column();
create trigger assessment_scores_updated_at before update on public.assessment_scores for each row execute function public.update_updated_at_column();

create function public.is_super_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.platform_memberships where user_id = auth.uid() and role = 'super_admin') $$;

create function public.current_school_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select school_id from public.school_memberships where user_id = auth.uid() limit 1 $$;

create function public.sms_has_school_role(target_school uuid, allowed_roles text[])
returns boolean language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then return false; end if;
  if public.is_super_admin() then return true; end if;
  return exists (
    select 1 from public.school_memberships m
    join public.schools s on s.id = m.school_id
    where m.user_id = auth.uid() and m.school_id = target_school
      and m.role = any (allowed_roles) and s.status = 'active'
  );
end;
$$;

create function public.sms_teacher_assigned(target_school uuid, target_class uuid, target_subject uuid default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.teacher_assignments a
    join public.teachers t on t.id = a.teacher_id and t.school_id = a.school_id
    where t.user_id = auth.uid()
      and a.school_id = target_school
      and (target_class is null or a.class_id = target_class)
      and (target_subject is null or a.subject_id = target_subject)
  );
$$;

create function public.sms_teacher_assignable(target_school uuid, target_teacher uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.sms_has_school_role(target_school, array['school_admin']) and exists (
    select 1 from public.teachers t
    where t.id = target_teacher and t.school_id = target_school and t.user_id is not null
  );
$$;

create function public.sms_is_linked_parent(target_school uuid, target_student uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.student_parents sp
    join public.students st on st.id = sp.student_id
    join public.school_memberships sm on sm.user_id = sp.parent_id and sm.school_id = st.school_id
    join public.schools s on s.id = st.school_id
    where sp.parent_id = auth.uid()
      and sp.student_id = target_student
      and st.school_id = target_school
      and sm.role = 'parent'
      and s.status = 'active'
  );
$$;

create function public.sms_can_manage_parent_link(target_student uuid, target_parent uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.students st
    join public.school_memberships pm on pm.school_id = st.school_id
    where st.id = target_student
      and pm.user_id = target_parent
      and pm.role = 'parent'
      and public.sms_has_school_role(st.school_id, array['school_admin'])
  );
$$;

create function public.sms_current_session(target_school uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select id from public.academic_sessions where school_id = target_school and is_current limit 1 $$;

create function public.sms_grade(score numeric)
returns text language sql immutable set search_path = ''
as $$ select case when score >= 80 then 'A' when score >= 70 then 'B' when score >= 60 then 'C' when score >= 50 then 'D' else 'F' end; $$;

create function public.sms_validate_result_grade()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.score is null or new.score::text in ('NaN', 'Infinity', '-Infinity') or new.score < 0 or new.score > 100 then
    raise exception 'Score must be between 0 and 100';
  end if;
  new.grade = public.sms_grade(new.score);
  return new;
end;
$$;

create function public.sms_validate_result_amendment()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  original public.results%rowtype;
  previous record;
begin
  if coalesce(auth.role(), '') <> 'service_role' and new.amended_by is distinct from auth.uid() then
    raise exception 'Amendment actor must be the authenticated user' using errcode = '42501';
  end if;
  if not (
    exists (select 1 from public.platform_memberships where user_id = new.amended_by and role = 'super_admin')
    or exists (
      select 1 from public.school_memberships m join public.schools s on s.id = m.school_id
      where m.user_id = new.amended_by and m.school_id = new.school_id and m.role = 'school_admin' and s.status = 'active'
    )
  ) then
    raise exception 'Only an authorized administrator can amend results' using errcode = '42501';
  end if;
  if new.new_score is null or new.new_score::text in ('NaN', 'Infinity', '-Infinity') or new.new_score < 0 or new.new_score > 100 then
    raise exception 'Score must be between 0 and 100';
  end if;
  if new.reason is null or length(btrim(new.reason)) not between 1 and 2000 then
    raise exception 'An amendment reason of 1 to 2000 characters is required';
  end if;
  select * into original from public.results where id = new.result_id and school_id = new.school_id for update;
  if not found then raise exception 'Result does not belong to this school'; end if;
  select new_score, created_at into previous from public.result_amendments
    where result_id = original.id and school_id = new.school_id
    order by created_at desc, id desc limit 1;
  new.old_score = coalesce(previous.new_score, original.score);
  if new.old_score = new.new_score then raise exception 'The amended score is unchanged'; end if;
  new.old_grade = public.sms_grade(new.old_score);
  new.new_grade = public.sms_grade(new.new_score);
  new.reason = btrim(new.reason);
  new.created_at = greatest(clock_timestamp(), coalesce(previous.created_at + interval '1 microsecond', clock_timestamp()));
  return new;
end;
$$;

create trigger sms_validate_result_grade before insert on public.results for each row execute function public.sms_validate_result_grade();
create trigger sms_validate_result_amendment before insert on public.result_amendments for each row execute function public.sms_validate_result_amendment();

create function public.enforce_payment_integrity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare fee record; paid numeric;
begin
  if new.amount is null or new.amount::text in ('NaN', 'Infinity', '-Infinity') or new.amount <= 0 or new.amount <> round(new.amount, 2) then
    raise exception 'Payment amount must be a positive value with at most two decimals';
  end if;
  select * into fee from public.fees where id = new.fee_id and school_id = new.school_id for update;
  if not found or fee.student_id <> new.student_id then
    raise exception 'Payment does not match a fee for this student and school';
  end if;
  select coalesce(sum(amount), 0) into paid from public.payments where fee_id = new.fee_id;
  if paid + new.amount > fee.amount_due then
    raise exception 'Payment exceeds the remaining fee balance';
  end if;
  return new;
end;
$$;

create trigger payments_integrity before insert on public.payments for each row execute function public.enforce_payment_integrity();

create function public.sms_assessment_scope(target_school uuid, target_class uuid, target_subject uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.sms_has_school_role(target_school, array['school_admin'])
    or (public.sms_has_school_role(target_school, array['teacher']) and public.sms_teacher_assigned(target_school, target_class, target_subject));
$$;

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

create trigger assessment_scores_validate before insert or update on public.assessment_scores for each row execute function public.sms_validate_assessment_score();

create function public.sms_announcement_visible(target_school uuid, target_audience text)
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

create function public.sms_assessment_questions(target_assessment uuid)
returns table (id uuid, sort_order integer, prompt text, question_type text, options jsonb, points numeric)
language sql stable security definer set search_path = ''
as $$
  select q.id, q.sort_order, q.prompt, q.question_type, q.options, q.points
  from public.assessment_questions q
  join public.assessments a on a.id = q.assessment_id
  where q.assessment_id = target_assessment
    and public.sms_self_in_class(a.school_id, a.class_id)
  order by q.sort_order;
$$;

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

revoke all on function public.sms_has_school_role(uuid, text[]) from public, anon;
revoke all on function public.sms_is_self_student(uuid, uuid) from public, anon;
revoke all on function public.sms_self_in_class(uuid, uuid) from public, anon;
revoke all on function public.sms_assessment_questions(uuid) from public, anon;
revoke all on function public.sms_is_linked_parent(uuid, uuid) from public, anon;
revoke all on function public.sms_can_manage_parent_link(uuid, uuid) from public, anon;
revoke all on function public.sms_teacher_assigned(uuid, uuid, uuid) from public, anon;
revoke all on function public.sms_teacher_assignable(uuid, uuid) from public, anon;
revoke all on function public.sms_current_session(uuid) from public, anon;
revoke all on function public.sms_assessment_scope(uuid, uuid, uuid) from public, anon;
revoke all on function public.sms_announcement_visible(uuid, text) from public, anon;
revoke all on function public.sms_branding_access(text, boolean) from public;
revoke all on function public.sms_record_access(text, boolean) from public;

grant execute on function public.sms_has_school_role(uuid, text[]) to authenticated;
grant execute on function public.sms_is_self_student(uuid, uuid) to authenticated;
grant execute on function public.sms_self_in_class(uuid, uuid) to authenticated;
grant execute on function public.sms_assessment_questions(uuid) to authenticated;
grant execute on function public.sms_is_linked_parent(uuid, uuid) to authenticated;
grant execute on function public.sms_can_manage_parent_link(uuid, uuid) to authenticated;
grant execute on function public.sms_teacher_assigned(uuid, uuid, uuid) to authenticated;
grant execute on function public.sms_teacher_assignable(uuid, uuid) to authenticated;
grant execute on function public.sms_current_session(uuid) to authenticated;
grant execute on function public.sms_assessment_scope(uuid, uuid, uuid) to authenticated;
grant execute on function public.sms_announcement_visible(uuid, text) to authenticated;
grant execute on function public.sms_branding_access(text, boolean) to anon, authenticated;
grant execute on function public.sms_record_access(text, boolean) to anon, authenticated;

commit;
