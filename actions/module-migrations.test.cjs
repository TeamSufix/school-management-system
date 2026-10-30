const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { PGlite } = require("@electric-sql/pglite");

const id = (number) => `00000000-0000-0000-0000-${String(number).padStart(12, "0")}`;
const migration = (name) => readFileSync(path.join(__dirname, "..", "supabase", "migrations", name), "utf8");

async function fixture(db) {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create table profiles (id uuid primary key);
    create table schools (id uuid primary key, status text default 'active', name text, updated_at timestamptz);
    create table school_memberships (user_id uuid, school_id uuid, role text);
    create table classes (id uuid primary key, school_id uuid, name text);
    create table subjects (id uuid primary key, school_id uuid, name text);
    create table teachers (id uuid primary key, school_id uuid, user_id uuid, status text);
    create table students (id uuid primary key, school_id uuid, class_id uuid, student_id text, status text default 'active');
    create table student_parents (student_id uuid, parent_id uuid);
    create table attendance (id uuid primary key, school_id uuid, student_id uuid, class_id uuid, date date, status text, constraint attendance_status_check check (status in ('present', 'absent', 'late')));
    create table fees (id uuid primary key, school_id uuid, student_id uuid, amount_due numeric, academic_year text, term text);
    create table payments (id uuid primary key, school_id uuid, student_id uuid, fee_id uuid, amount numeric, date date, payment_method text, reference text, created_at timestamptz default now());
    create table teacher_assignments (id uuid primary key, school_id uuid, teacher_id uuid, class_id uuid, subject_id uuid, created_at timestamptz default now());
    create function public.is_super_admin() returns boolean language sql stable security definer set search_path = '' as $$ select false $$;
    create function public.sms_has_school_role(target_school uuid, allowed_roles text[]) returns boolean language sql stable security definer set search_path = '' as $$ select true $$;
    create function public.sms_teacher_assigned(target_school uuid, target_class uuid, target_subject uuid default null) returns boolean language sql stable security definer set search_path = '' as $$ select true $$;
    create function public.update_updated_at_column() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
    insert into schools values ('${id(1)}', 'active', 'Test', null);
    insert into classes values ('${id(21)}', '${id(1)}', 'JHS 1'), ('${id(22)}', '${id(1)}', 'JHS 2');
    insert into subjects values ('${id(31)}', '${id(1)}', 'Math');
    insert into students values ('${id(41)}', '${id(1)}', '${id(21)}', 's1', 'active'), ('${id(42)}', '${id(1)}', '${id(22)}', 's2', 'active');
  `);
}

test("attendance migration allows excused and still rejects invalid statuses", async () => {
  const db = new PGlite();
  await fixture(db);
  await assert.rejects(
    db.query("insert into attendance values ($1, $2, $3, $4, current_date, 'excused')", [id(61), id(1), id(41), id(21)]),
    /attendance_status_check/,
  );
  await db.exec(migration("202610290001_attendance_status.sql"));
  await db.query("insert into attendance values ($1, $2, $3, $4, current_date, 'excused')", [id(61), id(1), id(41), id(21)]);
  await assert.rejects(
    db.query("insert into attendance values ($1, $2, $3, $4, current_date, 'other')", [id(62), id(1), id(41), id(21)]),
    /attendance_status_check/,
  );
});

test("academic structure creates sessions, streams and one current enrollment", async () => {
  const db = new PGlite();
  await fixture(db);
  await db.exec(migration("202610290005_academic_structure.sql"));
  await db.query("insert into academic_sessions (school_id, name, is_current) values ($1, '2026/2027', true)", [id(1)]);
  await db.query("insert into streams (school_id, class_id, name) values ($1, $2, 'A')", [id(1), id(21)]);
  await db.query("insert into enrollments (school_id, student_id, session_id, class_id) select $1, $2, id, $3 from academic_sessions where is_current", [id(1), id(41), id(21)]);
  await assert.rejects(
    db.query("insert into enrollments (school_id, student_id, session_id, class_id) select $1, $2, id, $3 from academic_sessions where is_current", [id(1), id(41), id(21)]),
    /idx_enrollments_one_current/,
  );
});

test("assessment score trigger rejects out-of-range scores and wrong-class students", async () => {
  const db = new PGlite();
  await fixture(db);
  await db.exec(migration("202610290005_academic_structure.sql"));
  await db.exec(migration("202610290006_assessments.sql"));
  const assessment = await db.query("insert into assessments (school_id, class_id, subject_id, academic_year, term, name, assessment_type, weight, max_score) values ($1, $2, $3, '2026/2027', 'term_1', 'Quiz', 'class_test', 10, 20) returning id", [id(1), id(21), id(31)]);
  const assessmentId = assessment.rows[0].id;
  await db.query("insert into assessment_scores (school_id, assessment_id, student_id, score) values ($1, $2, $3, 15)", [id(1), assessmentId, id(41)]);
  await assert.rejects(
    db.query("insert into assessment_scores (school_id, assessment_id, student_id, score) values ($1, $2, $3, 21)", [id(1), assessmentId, id(41)]),
    /exceeds the assessment maximum/,
  );
  await assert.rejects(
    db.query("insert into assessment_scores (school_id, assessment_id, student_id, score) values ($1, $2, $3, 10)", [id(1), assessmentId, id(42)]),
    /not enrolled in the assessment class/,
  );
});

test("finance detail migration adds fee items and payment actor tracking", async () => {
  const db = new PGlite();
  await fixture(db);
  await db.exec(migration("202610290007_finance_detail.sql"));
  await db.query("insert into profiles values ($1)", [id(14)]);
  await db.query("insert into fees values ($1, $2, $3, 300, '2026/2027', 'term_1')", [id(51), id(1), id(41)]);
  await db.query("insert into fee_items (school_id, fee_id, name, amount) values ($1, $2, 'Tuition', 250), ($1, $2, 'Books', 50)", [id(1), id(51)]);
  await db.query("insert into payments (id, school_id, student_id, fee_id, amount, date, payment_method, recorded_by) values ($5, $1, $2, $3, 100, current_date, 'cash', $4)", [id(1), id(41), id(51), id(14), id(91)]);
  const items = await db.query("select sum(amount) as total from fee_items where fee_id = $1", [id(51)]);
  assert.equal(Number(items.rows[0].total), 300);
  const payment = await db.query("select recorded_by from payments where fee_id = $1", [id(51)]);
  assert.equal(payment.rows[0].recorded_by, id(14));
});
