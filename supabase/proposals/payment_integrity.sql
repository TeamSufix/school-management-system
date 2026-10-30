begin;

create function public.enforce_payment_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fee public.fees%rowtype;
  total_paid numeric;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not (
    exists (
      select 1 from public.platform_memberships pm
      where pm.user_id = auth.uid() and pm.role = 'super_admin'
    ) or exists (
      select 1 from public.school_memberships sm
      join public.schools s on s.id = sm.school_id
      where sm.user_id = auth.uid()
        and sm.school_id = new.school_id
        and sm.role in ('school_admin', 'accountant')
        and s.status = 'active'
    )
  ) then
    raise exception 'Not authorized to record payments' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and (
    new.fee_id is distinct from old.fee_id or
    new.student_id is distinct from old.student_id or
    new.school_id is distinct from old.school_id or
    new.id is distinct from old.id
  ) then
    raise exception 'Payment identity cannot be changed';
  end if;

  if new.amount is null or new.amount <= 0 or
    new.amount::text in ('NaN', 'Infinity', '-Infinity') or
    new.amount <> round(new.amount::numeric, 2)
  then
    raise exception 'Payment amount must be positive with at most two decimal places';
  end if;

  select * into fee from public.fees
    where id = new.fee_id
      and student_id = new.student_id
      and school_id = new.school_id
    for update;

  if not found then
    raise exception 'Fee does not belong to the selected student and school';
  end if;

  select coalesce(sum(p.amount), 0) into total_paid
    from public.payments p
    where p.fee_id = fee.id and p.id is distinct from new.id;

  if total_paid + new.amount > fee.amount_due then
    raise exception 'Payment exceeds the remaining balance';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_payment_integrity() from public, anon, authenticated;

create trigger enforce_payment_integrity
before insert or update on public.payments
for each row execute function public.enforce_payment_integrity();

commit;
