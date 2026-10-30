select 'duplicate_teacher_logins' as check_name, count(*) as problem_count
from (select school_id, user_id from public.teachers where user_id is not null group by school_id, user_id having count(*) > 1) d
union all
select 'duplicate_normalized_fee_periods', count(*)
from (select school_id, student_id, replace(btrim(academic_year), '-', '/'), term from public.fees group by school_id, student_id, replace(btrim(academic_year), '-', '/'), term having count(*) > 1) d
union all
select 'duplicate_normalized_result_periods', count(*)
from (select school_id, student_id, subject_id, replace(btrim(academic_year), '-', '/'), term from public.results group by school_id, student_id, subject_id, replace(btrim(academic_year), '-', '/'), term having count(*) > 1) d
union all
select 'cross_school_student_classes', count(*)
from public.students st join public.classes c on c.id = st.class_id where c.school_id <> st.school_id
union all
select 'inconsistent_attendance_school', count(*)
from public.attendance a join public.students st on st.id = a.student_id join public.classes c on c.id = a.class_id where a.school_id <> st.school_id or a.school_id <> c.school_id
union all
select 'inconsistent_result_school', count(*)
from public.results r join public.students st on st.id = r.student_id join public.classes c on c.id = r.class_id join public.subjects su on su.id = r.subject_id where r.school_id <> st.school_id or r.school_id <> c.school_id or r.school_id <> su.school_id
union all
select 'cross_school_fees', count(*)
from public.fees f join public.students st on st.id = f.student_id where f.school_id <> st.school_id
union all
select 'inconsistent_payment_links', count(*)
from public.payments p join public.fees f on f.id = p.fee_id where p.school_id <> f.school_id or p.student_id <> f.student_id
union all
select 'overpaid_fees', count(*)
from (select f.id from public.fees f join public.payments p on p.fee_id = f.id group by f.id, f.amount_due having sum(p.amount) > f.amount_due) d
union all
select 'invalid_parent_links', count(*)
from public.student_parents sp join public.students st on st.id = sp.student_id where not exists (select 1 from public.school_memberships sm where sm.user_id = sp.parent_id and sm.school_id = st.school_id and sm.role = 'parent')
union all
select 'active_teachers_without_login', count(*)
from public.teachers where status = 'active' and user_id is null
union all
select 'active_teachers_without_teacher_membership', count(*)
from public.teachers t where t.status = 'active' and t.user_id is not null and not exists (select 1 from public.school_memberships sm where sm.user_id = t.user_id and sm.school_id = t.school_id and sm.role = 'teacher')
union all
select 'users_with_multiple_school_memberships', count(*)
from (select user_id from public.school_memberships group by user_id having count(*) > 1) d;
