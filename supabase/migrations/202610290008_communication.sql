begin;

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(btrim(body)) between 1 and 5000),
  audience text not null default 'all' check (audience in ('all', 'staff', 'teachers', 'parents')),
  publish_on date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_announcements_school on public.announcements(school_id, publish_on desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 200),
  body text not null check (length(btrim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id, read_at);

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  weekday smallint not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null check (ends_at > starts_at),
  created_at timestamptz not null default now(),
  unique (school_id, class_id, weekday, starts_at)
);

create index idx_timetable_class on public.timetable_entries(school_id, class_id);

alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.timetable_entries enable row level security;

create function public.sms_announcement_visible(target_school uuid, target_audience text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case target_audience
    when 'all' then public.sms_has_school_role(target_school, array['school_admin', 'teacher', 'accountant', 'parent'])
    when 'staff' then public.sms_has_school_role(target_school, array['school_admin', 'teacher', 'accountant'])
    when 'teachers' then public.sms_has_school_role(target_school, array['school_admin', 'teacher'])
    when 'parents' then public.sms_has_school_role(target_school, array['school_admin', 'parent'])
    else false
  end;
$$;

revoke all on function public.sms_announcement_visible(uuid, text) from public, anon;
grant execute on function public.sms_announcement_visible(uuid, text) to authenticated;

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

create policy notifications_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_read_guard on public.notifications as restrictive for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and read_at is not null);
create policy notifications_insert on public.notifications for insert to authenticated
  with check (public.sms_has_school_role(school_id, array['school_admin']));
create policy notifications_insert_guard on public.notifications as restrictive for insert to authenticated
  with check (public.sms_has_school_role(school_id, array['school_admin']));

create policy timetable_read on public.timetable_entries for select to authenticated
  using (
    public.sms_has_school_role(school_id, array['school_admin', 'accountant'])
    or (public.sms_has_school_role(school_id, array['teacher']) and public.sms_teacher_assigned(school_id, class_id))
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

commit;
