begin;

create function public.sms_has_school_role(target_school uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.school_memberships sm
    join public.schools s on s.id = sm.school_id
    where sm.user_id = auth.uid()
      and sm.school_id = target_school
      and sm.role = any(allowed_roles)
      and s.status = 'active'
  );
$$;

create function public.sms_is_linked_parent(target_school uuid, target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_parents sp
    join public.students st on st.id = sp.student_id
    join public.school_memberships sm
      on sm.user_id = sp.parent_id and sm.school_id = st.school_id
    join public.schools s on s.id = st.school_id
    where sp.parent_id = auth.uid()
      and sp.student_id = target_student
      and st.school_id = target_school
      and sm.role = 'parent'
      and s.status = 'active'
  );
$$;

revoke all on function public.sms_has_school_role(uuid, text[]) from public, anon;
revoke all on function public.sms_is_linked_parent(uuid, uuid) from public, anon;
grant execute on function public.sms_has_school_role(uuid, text[]) to authenticated;
grant execute on function public.sms_is_linked_parent(uuid, uuid) to authenticated;

create policy sms_school_read_guard on public.schools
as restrictive for select to authenticated
using (public.sms_has_school_role(id, array['school_admin', 'teacher', 'accountant', 'parent']));

create policy sms_student_read_guard on public.students
as restrictive for select to authenticated
using (
  public.sms_has_school_role(school_id, array['school_admin', 'teacher', 'accountant'])
  or public.sms_is_linked_parent(school_id, id)
);

create policy sms_attendance_read_guard on public.attendance
as restrictive for select to authenticated
using (
  public.sms_has_school_role(school_id, array['school_admin', 'teacher'])
  or public.sms_is_linked_parent(school_id, student_id)
);

create policy sms_result_read_guard on public.results
as restrictive for select to authenticated
using (
  public.sms_has_school_role(school_id, array['school_admin', 'teacher'])
  or public.sms_is_linked_parent(school_id, student_id)
);

create policy sms_amendment_read_guard on public.result_amendments
as restrictive for select to authenticated
using (
  public.sms_has_school_role(school_id, array['school_admin', 'teacher'])
  or exists (
    select 1 from public.results r
    where r.id = result_id and r.school_id = result_amendments.school_id
      and public.sms_is_linked_parent(r.school_id, r.student_id)
  )
);

create policy sms_fee_read_guard on public.fees
as restrictive for select to authenticated
using (
  public.sms_has_school_role(school_id, array['school_admin', 'accountant'])
  or public.sms_is_linked_parent(school_id, student_id)
);

create policy sms_payment_read_guard on public.payments
as restrictive for select to authenticated
using (
  public.sms_has_school_role(school_id, array['school_admin', 'accountant'])
  or public.sms_is_linked_parent(school_id, student_id)
);

create policy sms_teacher_read_guard on public.teachers
as restrictive for select to authenticated
using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']));

create policy sms_parent_link_read_guard on public.student_parents
as restrictive for select to authenticated
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
declare
  target_table text;
begin
  foreach target_table in array array['classes', 'subjects'] loop
    execute format(
      'create policy sms_catalog_read_guard on public.%I as restrictive for select to authenticated using (public.sms_has_school_role(school_id, array[''school_admin'', ''teacher'', ''accountant'', ''parent'']))',
      target_table
    );
  end loop;

  foreach target_table in array array['classes', 'subjects', 'students', 'teachers'] loop
    execute format(
      'create policy sms_admin_insert_guard on public.%I as restrictive for insert to authenticated with check (public.sms_has_school_role(school_id, array[''school_admin'']))',
      target_table
    );
    execute format(
      'create policy sms_admin_update_guard on public.%I as restrictive for update to authenticated using (public.sms_has_school_role(school_id, array[''school_admin''])) with check (public.sms_has_school_role(school_id, array[''school_admin'']))',
      target_table
    );
    execute format(
      'create policy sms_admin_delete_guard on public.%I as restrictive for delete to authenticated using (public.sms_has_school_role(school_id, array[''school_admin'']))',
      target_table
    );
  end loop;

  foreach target_table in array array['attendance', 'results'] loop
    execute format(
      'create policy sms_academic_insert_guard on public.%I as restrictive for insert to authenticated with check (public.sms_has_school_role(school_id, array[''school_admin'', ''teacher'']))',
      target_table
    );
  end loop;

  foreach target_table in array array['fees', 'payments'] loop
    execute format(
      'create policy sms_finance_insert_guard on public.%I as restrictive for insert to authenticated with check (public.sms_has_school_role(school_id, array[''school_admin'', ''accountant'']))',
      target_table
    );
    execute format(
      'create policy sms_finance_delete_guard on public.%I as restrictive for delete to authenticated using (false)',
      target_table
    );
  end loop;

  foreach target_table in array array['results', 'result_amendments', 'payments'] loop
    execute format(
      'create policy sms_immutable_update_guard on public.%I as restrictive for update to authenticated using (false) with check (false)',
      target_table
    );
  end loop;
end;
$$;

create policy sms_attendance_update_guard on public.attendance
as restrictive for update to authenticated
using (public.sms_has_school_role(school_id, array['school_admin', 'teacher']))
with check (public.sms_has_school_role(school_id, array['school_admin', 'teacher']));

create policy sms_attendance_delete_guard on public.attendance
as restrictive for delete to authenticated
using (public.sms_has_school_role(school_id, array['school_admin']));

create policy sms_fee_update_guard on public.fees
as restrictive for update to authenticated
using (false)
with check (false);

create policy sms_result_delete_guard on public.results
as restrictive for delete to authenticated
using (false);

create policy sms_amendment_delete_guard on public.result_amendments
as restrictive for delete to authenticated
using (false);

create policy sms_amendment_insert_guard on public.result_amendments
as restrictive for insert to authenticated
with check (
  public.sms_has_school_role(school_id, array['school_admin'])
  and amended_by = auth.uid()
  and new_score between 0 and 100
  and length(btrim(reason)) > 0
  and exists (
    select 1 from public.results r
    where r.id = result_id and r.school_id = result_amendments.school_id
  )
);

create function public.sms_can_manage_parent_link(target_student uuid, target_parent uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.students st
    join public.school_memberships pm on pm.school_id = st.school_id
    where st.id = target_student
      and pm.user_id = target_parent
      and pm.role = 'parent'
      and public.sms_has_school_role(st.school_id, array['school_admin'])
  );
$$;

revoke all on function public.sms_can_manage_parent_link(uuid, uuid) from public, anon;
grant execute on function public.sms_can_manage_parent_link(uuid, uuid) to authenticated;

create policy sms_parent_link_insert_guard on public.student_parents
as restrictive for insert to authenticated
with check (public.sms_can_manage_parent_link(student_id, parent_id));

create policy sms_parent_link_delete_guard on public.student_parents
as restrictive for delete to authenticated
using (
  exists (
    select 1 from public.students st
    where st.id = student_parents.student_id
      and public.sms_has_school_role(st.school_id, array['school_admin'])
  )
);

create policy sms_parent_link_update_guard on public.student_parents
as restrictive for update to authenticated
using (false)
with check (false);

create policy sms_student_class_guard on public.students
as restrictive for all to authenticated
using (true)
with check (
  class_id is null or exists (
    select 1 from public.classes c
    where c.id = class_id and c.school_id = students.school_id
  )
);

create policy sms_attendance_relationship_guard on public.attendance
as restrictive for all to authenticated
using (true)
with check (
  exists (
    select 1 from public.students st
    join public.classes c on c.id = st.class_id and c.school_id = st.school_id
    where st.id = attendance.student_id and st.school_id = attendance.school_id
      and st.class_id = attendance.class_id
  )
);

create policy sms_result_relationship_guard on public.results
as restrictive for insert to authenticated
with check (
  exists (
    select 1 from public.students st
    join public.classes c on c.id = st.class_id and c.school_id = st.school_id
    where st.id = results.student_id and st.school_id = results.school_id
      and st.class_id = results.class_id
  )
  and exists (
    select 1 from public.subjects su
    where su.id = subject_id and su.school_id = results.school_id
  )
);

create policy sms_fee_relationship_guard on public.fees
as restrictive for insert to authenticated
with check (
  amount_due >= 0 and amount_due < 'Infinity'::numeric
  and amount_due::text <> 'NaN'
  and amount_due = round(amount_due, 2)
  and exists (
    select 1 from public.students st
    where st.id = fees.student_id and st.school_id = fees.school_id
  )
);

commit;
