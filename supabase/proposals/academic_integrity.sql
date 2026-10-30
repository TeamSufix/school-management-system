begin;

create function public.sms_grade(score numeric)
returns text language sql immutable set search_path = ''
as $$
  select case when score >= 80 then 'A' when score >= 70 then 'B' when score >= 60 then 'C' when score >= 50 then 'D' else 'F' end;
$$;

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

create trigger sms_validate_result_grade before insert on public.results
for each row execute function public.sms_validate_result_grade();

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

revoke all on function public.sms_grade(numeric) from public, anon;
grant execute on function public.sms_grade(numeric) to authenticated, service_role;
revoke all on function public.sms_validate_result_grade() from public, anon, authenticated;
revoke all on function public.sms_validate_result_amendment() from public, anon, authenticated;

create trigger sms_validate_result_amendment before insert on public.result_amendments
for each row execute function public.sms_validate_result_amendment();

commit;
