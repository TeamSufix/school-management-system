-- Row level security, grants and storage setup for the SchoolMS baseline.
-- Apply after 002_functions.sql on a fresh project.

begin;

alter table public.profiles enable row level security;
alter table public.platform_memberships enable row level security;
alter table public.schools enable row level security;
alter table public.school_memberships enable row level security;
alter table public.platform_settings enable row level security;
alter table public.school_academic_settings enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.academic_sessions enable row level security;
alter table public.academic_terms enable row level security;
alter table public.streams enable row level security;
alter table public.students enable row level security;
alter table public.student_parents enable row level security;
alter table public.student_documents enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance enable row level security;
alter table public.results enable row level security;
alter table public.result_amendments enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_scores enable row level security;
alter table public.fees enable row level security;
alter table public.fee_items enable row level security;
alter table public.payments enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.timetable_entries enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_submissions enable row level security;
alter table public.student_term_remarks enable row level security;

-- Identity tables -------------------------------------------------------------

create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_super_admin());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy platform_memberships_read on public.platform_memberships for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
create policy platform_memberships_write on public.platform_memberships for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy memberships_self_read on public.school_memberships for select to authenticated using (user_id = auth.uid() or public.is_super_admin() or public.sms_has_school_role(school_id, array['school_admin']));
create policy memberships_write on public.school_memberships for all to authenticated using (public.is_super_admin() or public.sms_has_school_role(school_id, array['school_admin'])) with check (public.is_super_admin() or public.sms_has_school_role(school_id, array['school_admin']));
create policy schools_base_read on public.schools for select to authenticated using (public.sms_has_school_role(id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy schools_base_write on public.schools for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy platform_settings_read on public.platform_settings for select to anon, authenticated using (true);
create policy platform_settings_insert on public.platform_settings for insert to authenticated with check (public.is_super_admin() and updated_by = auth.uid());
create policy platform_settings_update on public.platform_settings for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin() and updated_by = auth.uid());

grant select (id, platform_name, support_email, support_phone) on public.platform_settings to anon;
grant select, insert, update on public.platform_settings to authenticated;
grant select, insert, update on public.platform_settings to service_role;

-- Base read/write policies (restrictive guards below enforce the real limits) --

do $$
declare target_table text;
begin
  foreach target_table in array array[
    'classes', 'subjects', 'teachers', 'teacher_assignments', 'academic_sessions',
    'academic_terms', 'streams', 'students', 'student_parents', 'student_documents',
    'enrollments', 'attendance', 'results', 'result_amendments', 'assessments',
    'assessment_scores', 'fees', 'fee_items', 'payments', 'announcements',
    'notifications', 'timetable_entries', 'school_academic_settings',
    'assessment_questions', 'assessment_submissions'
  ] loop
    execute format('create policy sms_base_select on public.%I for select to authenticated using (true)', target_table);
    execute format('create policy sms_base_insert on public.%I for insert to authenticated with check (true)', target_table);
    execute format('create policy sms_base_update on public.%I for update to authenticated using (true) with check (true)', target_table);
    execute format('create policy sms_base_delete on public.%I for delete to authenticated using (true)', target_table);
  end loop;
end;
$$;

-- Restrictive guards (from rls_hardening) -------------------------------------

create policy sms_school_read_guard on public.schools as restrictive for select to authenticated
  using (public.sms_has_school_role(id, array['school_admin', 'teacher', 'accountant', 'parent', 'student']));
create policy sms_student_read_guard on public.students as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant']) or public.sms_is_linked_parent(school_id, id) or user_id = auth.uid());
create policy sms_attendance_read_guard on public.attendance as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']) or public.sms_is_linked_parent(school_id, student_id) or public.sms_is_self_student(school_id, student_id));
create policy sms_result_read_guard on public.results as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']) or public.sms_is_linked_parent(school_id, student_id) or public.sms_is_self_student(school_id, student_id));
create policy sms_amendment_read_guard on public.result_amendments as restrictive for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'teacher'])
    or exists (select 1 from public.results r where r.id = result_id and r.school_id = result_amendments.school_id and public.sms_is_linked_parent(r.school_id, r.student_id))
  );
create policy sms_fee_read_guard on public.fees as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'accountant']) or public.sms_is_linked_parent(school_id, student_id) or public.sms_is_self_student(school_id, student_id));
create policy sms_payment_read_guard on public.payments as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'accountant']) or public.sms_is_linked_parent(school_id, student_id) or public.sms_is_self_student(school_id, student_id));
create policy sms_teacher_read_guard on public.teachers as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']));
create policy sms_parent_link_read_guard on public.student_parents as restrictive for select to authenticated
  using (
    exists (
      select 1 from public.students st
      where st.id = student_parents.student_id and (
        public.sms_has_school_role(st.school_id, array['school_admin'])
        or (parent_id = auth.uid() and public.sms_is_linked_parent(st.school_id, st.id))
      )
    )
  );

do $$
declare target_table text;
begin
  foreach target_table in array array['classes', 'subjects'] loop
    execute format('create policy sms_catalog_read_guard on public.%I as restrictive for select to authenticated using (public.sms_has_school_role(school_id, array[''school_admin'', ''teacher'', ''accountant'', ''parent'', ''student'']))', target_table);
  end loop;
  foreach target_table in array array['classes', 'subjects', 'students', 'teachers'] loop
    execute format('create policy sms_admin_insert_guard on public.%I as restrictive for insert to authenticated with check (public.sms_has_school_role(school_id, array[''school_admin'']))', target_table);
    execute format('create policy sms_admin_update_guard on public.%I as restrictive for update to authenticated using (public.sms_has_school_role(school_id, array[''school_admin''])) with check (public.sms_has_school_role(school_id, array[''school_admin'']))', target_table);
    execute format('create policy sms_admin_delete_guard on public.%I as restrictive for delete to authenticated using (public.sms_has_school_role(school_id, array[''school_admin'']))', target_table);
  end loop;
  foreach target_table in array array['attendance', 'results'] loop
    execute format('create policy sms_academic_insert_guard on public.%I as restrictive for insert to authenticated with check (public.sms_has_school_role(school_id, array[''school_admin'', ''teacher'']))', target_table);
  end loop;
  foreach target_table in array array['fees', 'payments'] loop
    execute format('create policy sms_finance_insert_guard on public.%I as restrictive for insert to authenticated with check (public.sms_has_school_role(school_id, array[''school_admin'', ''accountant'']))', target_table);
    execute format('create policy sms_finance_delete_guard on public.%I as restrictive for delete to authenticated using (false)', target_table);
  end loop;
  foreach target_table in array array['results', 'result_amendments', 'payments'] loop
    execute format('create policy sms_immutable_update_guard on public.%I as restrictive for update to authenticated using (false) with check (false)', target_table);
  end loop;
end;
$$;

create policy sms_attendance_update_guard on public.attendance as restrictive for update to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']))
  with check (public.sms_has_school_role(school_id, array['school_admin', 'teacher']));
create policy sms_attendance_delete_guard on public.attendance as restrictive for delete to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']));
create policy sms_fee_update_guard on public.fees as restrictive for update to authenticated
  using (false) with check (false);
create policy sms_result_delete_guard on public.results as restrictive for delete to authenticated using (false);
create policy sms_amendment_delete_guard on public.result_amendments as restrictive for delete to authenticated using (false);
create policy sms_amendment_insert_guard on public.result_amendments as restrictive for insert to authenticated
  with check (
    public.sms_has_school_role(school_id, array['school_admin'])
    and amended_by = auth.uid()
    and new_score between 0 and 100
    and length(btrim(reason)) > 0
    and exists (select 1 from public.results r where r.id = result_id and r.school_id = result_amendments.school_id)
  );
create policy sms_parent_link_insert_guard on public.student_parents as restrictive for insert to authenticated
  with check (public.sms_can_manage_parent_link(student_id, parent_id));
create policy sms_parent_link_delete_guard on public.student_parents as restrictive for delete to authenticated
  using (exists (select 1 from public.students st where st.id = student_parents.student_id and public.sms_has_school_role(st.school_id, array['school_admin'])));
create policy sms_parent_link_update_guard on public.student_parents as restrictive for update to authenticated
  using (false) with check (false);
create policy sms_student_class_guard on public.students as restrictive for all to authenticated
  using (true)
  with check (class_id is null or exists (select 1 from public.classes c where c.id = class_id and c.school_id = students.school_id));
create policy sms_attendance_relationship_guard on public.attendance as restrictive for all to authenticated
  using (true)
  with check (
    exists (
      select 1 from public.students st
      join public.classes c on c.id = st.class_id and c.school_id = st.school_id
      where st.id = attendance.student_id and st.school_id = attendance.school_id and st.class_id = attendance.class_id
    )
  );
create policy sms_result_relationship_guard on public.results as restrictive for insert to authenticated
  with check (
    exists (
      select 1 from public.students st
      join public.classes c on c.id = st.class_id and c.school_id = st.school_id
      where st.id = results.student_id and st.school_id = results.school_id and st.class_id = results.class_id
    )
    and exists (select 1 from public.subjects su where su.id = subject_id and su.school_id = results.school_id)
  );
create policy sms_fee_relationship_guard on public.fees as restrictive for insert to authenticated
  with check (
    amount_due >= 0 and amount_due < 'Infinity'::numeric
    and amount_due::text <> 'NaN'
    and amount_due = round(amount_due, 2)
    and exists (select 1 from public.students st where st.id = fees.student_id and st.school_id = fees.school_id)
  );

-- Teacher assignment and academic configuration scope ------------------------

create policy settings_read on public.school_academic_settings for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy settings_read_guard on public.school_academic_settings as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant', 'parent']));
create policy settings_write on public.school_academic_settings for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy settings_write_guard on public.school_academic_settings as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));

create policy assignments_read on public.teacher_assignments for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']));
create policy assignments_read_guard on public.teacher_assignments as restrictive for select to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']));
create policy assignments_write on public.teacher_assignments for all to authenticated
  using (public.sms_teacher_assignable(school_id, teacher_id))
  with check (public.sms_teacher_assignable(school_id, teacher_id));
create policy assignments_write_guard on public.teacher_assignments as restrictive for all to authenticated
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

-- New module policies (mirrors migrations 0005-0008) --------------------------

do $$
declare target_table text;
begin
  foreach target_table in array array['academic_sessions', 'academic_terms', 'streams'] loop
    execute format('create policy %I_read on public.%I for select to authenticated using (public.sms_has_school_role(school_id, array[''school_admin'', ''teacher'', ''accountant'', ''parent'']))', target_table, target_table);
    execute format('create policy %I_read_guard on public.%I as restrictive for select to authenticated using (public.sms_has_school_role(school_id, array[''school_admin'', ''teacher'', ''accountant'', ''parent'']))', target_table, target_table);
    execute format('create policy %I_write on public.%I for all to authenticated using (public.sms_has_school_role(school_id, array[''school_admin''])) with check (public.sms_has_school_role(school_id, array[''school_admin'']))', target_table, target_table);
    execute format('create policy %I_write_guard on public.%I as restrictive for all to authenticated using (public.sms_has_school_role(school_id, array[''school_admin''])) with check (public.sms_has_school_role(school_id, array[''school_admin'']))', target_table, target_table);
  end loop;
end;
$$;

create policy enrollments_read on public.enrollments for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant'])
    or exists (select 1 from public.student_parents sp where sp.student_id = enrollments.student_id and sp.parent_id = auth.uid())
  );
create policy enrollments_read_guard on public.enrollments as restrictive for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant'])
    or exists (select 1 from public.student_parents sp where sp.student_id = enrollments.student_id and sp.parent_id = auth.uid())
  );
create policy enrollments_write on public.enrollments for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy enrollments_write_guard on public.enrollments as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));

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
create policy assessments_write on public.assessments for all to authenticated
  using (public.sms_assessment_scope(school_id, class_id, subject_id))
  with check (public.sms_assessment_scope(school_id, class_id, subject_id) and created_by = auth.uid());
create policy assessments_write_guard on public.assessments as restrictive for all to authenticated
  using (public.sms_assessment_scope(school_id, class_id, subject_id))
  with check (public.sms_assessment_scope(school_id, class_id, subject_id));

create policy assessment_scores_read on public.assessment_scores for select to authenticated
  using (
    exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id))
    or public.sms_is_self_student(school_id, student_id)
    or exists (select 1 from public.student_parents sp where sp.student_id = assessment_scores.student_id and sp.parent_id = auth.uid())
  );
create policy assessment_scores_read_guard on public.assessment_scores as restrictive for select to authenticated
  using (
    exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id))
    or public.sms_is_self_student(school_id, student_id)
    or exists (select 1 from public.student_parents sp where sp.student_id = assessment_scores.student_id and sp.parent_id = auth.uid())
  );
create policy assessment_scores_write on public.assessment_scores for all to authenticated
  using (exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)))
  with check (
    recorded_by = auth.uid()
    and exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id))
    and exists (
      select 1 from public.students s
      join public.assessments a on a.id = assessment_scores.assessment_id
      where s.id = assessment_scores.student_id and s.school_id = assessment_scores.school_id and s.class_id = a.class_id
    )
  );
create policy assessment_scores_write_guard on public.assessment_scores as restrictive for all to authenticated
  using (exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)))
  with check (exists (select 1 from public.assessments a where a.id = assessment_id and public.sms_assessment_scope(a.school_id, a.class_id, a.subject_id)));

create policy payments_recorded_by_guard on public.payments as restrictive for insert to authenticated
  with check (recorded_by is null or recorded_by = auth.uid());

create policy fee_items_read on public.fee_items for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'accountant', 'teacher'])
    or exists (
      select 1 from public.fees f
      join public.student_parents sp on sp.student_id = f.student_id and sp.parent_id = auth.uid()
      where f.id = fee_items.fee_id
    )
  );
create policy fee_items_read_guard on public.fee_items as restrictive for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'accountant', 'teacher'])
    or exists (
      select 1 from public.fees f
      join public.student_parents sp on sp.student_id = f.student_id and sp.parent_id = auth.uid()
      where f.id = fee_items.fee_id
    )
  );
create policy fee_items_write on public.fee_items for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'accountant']))
  with check (
    public.sms_has_school_role(school_id, array['school_admin', 'accountant'])
    and exists (select 1 from public.fees f where f.id = fee_id and f.school_id = fee_items.school_id)
  );
create policy fee_items_write_guard on public.fee_items as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin', 'accountant']))
  with check (public.sms_has_school_role(school_id, array['school_admin', 'accountant']));

create policy announcements_read on public.announcements for select to authenticated
  using (publish_on <= current_date and public.sms_announcement_visible(school_id, audience));
create policy announcements_read_guard on public.announcements as restrictive for select to authenticated
  using (publish_on <= current_date and public.sms_announcement_visible(school_id, audience));
create policy announcements_write on public.announcements for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']) and created_by = auth.uid());
create policy announcements_write_guard on public.announcements as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));

create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_read_guard on public.notifications as restrictive for select to authenticated using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and read_at is not null);
create policy notifications_insert on public.notifications for insert to authenticated
  with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy notifications_insert_guard on public.notifications as restrictive for insert to authenticated
  with check (public.sms_has_school_role(school_id, array['school_admin']));

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
create policy timetable_write on public.timetable_entries for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy timetable_write_guard on public.timetable_entries as restrictive for all to authenticated
  using (public.sms_has_school_role(school_id, array['school_admin']))
  with check (public.sms_has_school_role(school_id, array['school_admin']));

-- Assessment questions and submissions ----------------------------------------

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

-- Report-card remarks -----------------------------------------------------------

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

-- Storage buckets and policies -------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('schoolms-branding', 'schoolms-branding', false, 524288, array['image/png', 'image/jpeg']),
  ('schoolms-records', 'schoolms-records', false, 5242880, array['image/png', 'image/jpeg', 'application/pdf'])
on conflict (id) do nothing;

create policy branding_read on storage.objects for select to authenticated
  using (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, false));
create policy branding_read_guard on storage.objects as restrictive for select to anon, authenticated
  using (bucket_id <> 'schoolms-branding' or public.sms_branding_access(name, false));
create policy branding_write on storage.objects for insert to authenticated
  with check (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, true));
create policy branding_write_guard on storage.objects as restrictive for insert to anon, authenticated
  with check (bucket_id <> 'schoolms-branding' or public.sms_branding_access(name, true));
create policy branding_update on storage.objects for update to authenticated
  using (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, true))
  with check (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, true));
create policy branding_update_guard on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id <> 'schoolms-branding' or public.sms_branding_access(name, true));
create policy branding_delete on storage.objects for delete to authenticated
  using (bucket_id = 'schoolms-branding' and public.sms_branding_access(name, true));
create policy branding_delete_guard on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id <> 'schoolms-branding' or public.sms_branding_access(name, true));

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
