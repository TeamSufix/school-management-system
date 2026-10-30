-- SchoolMS baseline schema (clean install).
-- Consolidates the reviewed proposals and every migration up to 202610290008.
-- Apply only to a fresh Supabase project; for existing databases use the
-- incremental files in supabase/migrations instead.

begin;

-- Core identity and tenancy -------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('super_admin')),
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  phone text,
  email text,
  address text,
  website text check (website is null or website ~* '^https?://[^[:space:]]+$'),
  school_type text not null default 'other' check (school_type in ('nursery', 'primary', 'junior_high', 'senior_high', 'combined', 'other')),
  logo_path text check (logo_path is null or (split_part(logo_path, '/', 1) = id::text and split_part(logo_path, '/', 2) = 'logos')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  role text not null check (role in ('school_admin', 'teacher', 'accountant', 'parent')),
  created_at timestamptz not null default now(),
  unique (user_id, school_id)
);

create table public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  platform_name text not null default 'SchoolMS' check (length(btrim(platform_name)) between 1 and 100),
  support_email text check (support_email is null or length(support_email) <= 254),
  support_phone text check (support_phone is null or length(support_phone) <= 40),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (1);

-- Academics -----------------------------------------------------------------

create table public.school_academic_settings (
  school_id uuid primary key references public.schools(id) on delete cascade,
  academic_year text not null,
  term text not null check (term in ('term_1', 'term_2', 'term_3')),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid references public.profiles(id),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (teacher_id, class_id, subject_id)
);

create table public.academic_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null check (name ~ '^[0-9]{4}/[0-9]{4}$'),
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, name),
  check (starts_on is null or ends_on is null or starts_on < ends_on)
);

create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  session_id uuid not null references public.academic_sessions(id) on delete cascade,
  name text not null check (name in ('term_1', 'term_2', 'term_3')),
  starts_on date,
  ends_on date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, name),
  check (starts_on is null or ends_on is null or starts_on < ends_on)
);

create table public.streams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 50),
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

-- Students ------------------------------------------------------------------

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id text not null,
  first_name text not null,
  last_name text not null,
  gender text,
  date_of_birth date,
  class_id uuid references public.classes(id) on delete set null,
  stream_id uuid references public.streams(id) on delete set null,
  phone text,
  address text,
  admission_date date,
  guardian_name text check (guardian_name is null or length(btrim(guardian_name)) between 1 and 200),
  guardian_relationship text check (guardian_relationship is null or length(btrim(guardian_relationship)) between 1 and 100),
  guardian_phone text check (guardian_phone is null or length(guardian_phone) <= 40),
  guardian_email text check (guardian_email is null or (length(guardian_email) <= 254 and guardian_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  photo_path text check (photo_path is null or (split_part(photo_path, '/', 1) = school_id::text and split_part(photo_path, '/', 2) = 'students')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, student_id)
);

create table public.student_parents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  relationship text,
  created_at timestamptz not null default now(),
  unique (student_id, parent_id)
);

create table public.student_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  file_name text not null check (length(btrim(file_name)) between 1 and 200),
  file_path text not null unique check (split_part(file_path, '/', 1) = school_id::text and split_part(file_path, '/', 2) = 'students'),
  description text check (description is null or length(description) <= 1000),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  session_id uuid not null references public.academic_sessions(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  stream_id uuid references public.streams(id) on delete set null,
  enrolled_on date not null default current_date,
  left_on date,
  created_at timestamptz not null default now()
);

create unique index idx_enrollments_one_current on public.enrollments(student_id, session_id) where left_on is null;

-- Operations -----------------------------------------------------------------

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  remarks text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  academic_year text not null,
  term text not null,
  score numeric(6,2) not null,
  grade text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.result_amendments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  result_id uuid not null references public.results(id) on delete cascade,
  old_score numeric(6,2),
  old_grade text,
  new_score numeric(6,2) not null,
  new_grade text,
  reason text not null,
  amended_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  session_id uuid references public.academic_sessions(id) on delete set null,
  academic_year text not null,
  term text not null check (term in ('term_1', 'term_2', 'term_3')),
  name text not null check (length(btrim(name)) between 1 and 200),
  assessment_type text not null check (assessment_type in ('class_test', 'assignment', 'mid_term', 'end_of_term', 'exam')),
  weight numeric(5,2) not null check (weight > 0 and weight <= 100),
  max_score numeric(6,2) not null default 100 check (max_score > 0 and max_score <= 1000),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (class_id, subject_id, academic_year, term, name)
);

create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(6,2) not null check (score >= 0),
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

-- Finance --------------------------------------------------------------------

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year text not null,
  term text not null,
  amount_due numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (student_id, academic_year, term)
);

create table public.fee_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  fee_id uuid not null references public.fees(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  fee_id uuid not null references public.fees(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(12,2) not null,
  date date not null,
  payment_method text not null check (payment_method in ('cash', 'mobile_money', 'bank', 'card')),
  reference text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Communication ----------------------------------------------------------------

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

-- Indexes ---------------------------------------------------------------------

create index idx_platform_memberships_user_id on public.platform_memberships(user_id);
create index idx_school_memberships_user_id on public.school_memberships(user_id);
create index idx_school_memberships_school_id on public.school_memberships(school_id);
create index idx_students_school_id on public.students(school_id);
create index idx_student_parents_parent on public.student_parents(parent_id);
create index idx_student_documents_student on public.student_documents(student_id);
create index idx_attendance_school_date on public.attendance(school_id, date);
create index idx_results_school_student on public.results(school_id, student_id);
create index idx_academic_terms_session on public.academic_terms(session_id);
create index idx_streams_class on public.streams(class_id);
create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_school on public.enrollments(school_id);
create index idx_assessments_scope on public.assessments(school_id, class_id, subject_id, academic_year, term);
create index idx_assessment_scores_assessment on public.assessment_scores(assessment_id);
create index idx_assessment_scores_student on public.assessment_scores(student_id);
create index idx_fee_items_fee on public.fee_items(fee_id);
create index idx_payments_school on public.payments(school_id);
create index idx_announcements_school on public.announcements(school_id, publish_on desc);
create index idx_notifications_user on public.notifications(user_id, read_at);
create index idx_timetable_class on public.timetable_entries(school_id, class_id);

commit;

-- Apply the shared helper functions, triggers and policies next:
--   supabase/baseline/002_functions.sql
--   supabase/baseline/003_policies.sql
