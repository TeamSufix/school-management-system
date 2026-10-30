begin;

alter table public.payments
  add column recorded_by uuid references public.profiles(id);

create policy payments_recorded_by_guard on public.payments as restrictive for insert to authenticated
  with check (recorded_by is null or recorded_by = auth.uid());

create table public.fee_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  fee_id uuid not null references public.fees(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index idx_fee_items_fee on public.fee_items(fee_id);

alter table public.fee_items enable row level security;

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

commit;
