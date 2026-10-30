begin;

alter table public.attendance
  drop constraint attendance_status_check,
  add constraint attendance_status_check
    check (status in ('present', 'absent', 'late', 'excused'));

commit;
