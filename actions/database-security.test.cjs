const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { PGlite } = require("@electric-sql/pglite");

const id = (number) => `00000000-0000-0000-0000-${String(number).padStart(12, "0")}`;

async function fixture(db) {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    grant usage on schema auth to authenticated;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create function auth.role() returns text language sql stable as $$
      select current_setting('request.jwt.claim.role', true);
    $$;
    create table schools (id uuid primary key, status text);
    create table school_memberships (user_id uuid, school_id uuid, role text);
    create table platform_memberships (user_id uuid, role text);
    create table classes (id uuid primary key, school_id uuid);
    create table subjects (id uuid primary key, school_id uuid);
    create table teachers (id uuid primary key, school_id uuid, user_id uuid, status text);
    create table students (id uuid primary key, school_id uuid, class_id uuid, student_id text);
    create table student_parents (student_id uuid, parent_id uuid);
    create table attendance (id uuid primary key, school_id uuid, student_id uuid, class_id uuid, date date not null default current_date, status text not null default 'present', constraint attendance_status_check check (status in ('present', 'absent', 'late')));
    create table results (id uuid primary key, school_id uuid, student_id uuid, class_id uuid, subject_id uuid, score numeric, academic_year text default '2026/2027', term text default 'term_1', grade text default 'F');
    create table result_amendments (id uuid primary key, school_id uuid, result_id uuid, amended_by uuid, new_score numeric, reason text, old_score numeric default 80, old_grade text default 'A', new_grade text default 'A', created_at timestamptz default now());
    create table fees (id uuid primary key, school_id uuid, student_id uuid, amount_due numeric, academic_year text default '2026/2027', term text default 'term_1');
    create table payments (id uuid primary key, school_id uuid, student_id uuid, fee_id uuid, amount numeric);
    create function public.is_super_admin() returns boolean language sql stable security definer set search_path = '' as $$
      select exists (select 1 from public.platform_memberships where user_id = auth.uid() and role = 'super_admin');
    $$;
    grant all on all tables in schema public to authenticated;
    insert into schools values ('${id(1)}', 'active'), ('${id(2)}', 'active'), ('${id(3)}', 'inactive');
    insert into school_memberships values
      ('${id(11)}', '${id(1)}', 'parent'),
      ('${id(12)}', '${id(1)}', 'teacher'),
      ('${id(13)}', '${id(1)}', 'accountant'),
      ('${id(14)}', '${id(1)}', 'school_admin'),
      ('${id(15)}', '${id(3)}', 'school_admin'),
      ('${id(16)}', '${id(2)}', 'parent');
    insert into classes values ('${id(21)}', '${id(1)}'), ('${id(22)}', '${id(2)}');
    insert into subjects values ('${id(31)}', '${id(1)}'), ('${id(32)}', '${id(2)}');
    insert into students values
      ('${id(41)}', '${id(1)}', '${id(21)}', 'child-one'),
      ('${id(42)}', '${id(1)}', '${id(21)}', 'child-two'),
      ('${id(43)}', '${id(2)}', '${id(22)}', 'other-school');
    insert into student_parents values ('${id(41)}', '${id(11)}');
    insert into fees values ('${id(51)}', '${id(1)}', '${id(41)}', 100), ('${id(52)}', '${id(1)}', '${id(42)}', 100);
    insert into attendance values ('${id(61)}', '${id(1)}', '${id(41)}', '${id(21)}'), ('${id(62)}', '${id(1)}', '${id(42)}', '${id(21)}');
    insert into results values ('${id(71)}', '${id(1)}', '${id(41)}', '${id(21)}', '${id(31)}', 80), ('${id(72)}', '${id(1)}', '${id(42)}', '${id(21)}', '${id(31)}', 70);
    insert into result_amendments values ('${id(81)}', '${id(1)}', '${id(71)}', '${id(14)}', 85, 'Correction');
    update results set grade = case when score >= 80 then 'A' when score >= 70 then 'B' else 'F' end;
  `);
  for (const table of ["schools", "classes", "subjects", "students", "teachers", "student_parents", "attendance", "results", "result_amendments", "fees", "payments"]) {
    await db.exec(`alter table ${table} enable row level security; create policy broad_existing_policy on ${table} for all to authenticated using (true) with check (true);`);
  }
  await db.exec(`
    alter table school_memberships enable row level security;
    create policy own_membership on school_memberships for select to authenticated using (user_id = auth.uid());
    alter table platform_memberships enable row level security;
    create policy own_platform_membership on platform_memberships for select to authenticated using (user_id = auth.uid());
  `);
  for (const file of ["rls_hardening.sql", "payment_integrity.sql", "school_configuration.sql", "academic_integrity.sql"]) {
    await db.exec(readFileSync(path.join(__dirname, "..", "supabase", "proposals", file), "utf8"));
  }
}

async function signIn(db, user) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', 'authenticated', false)", [id(user)]);
  await db.exec("set role authenticated");
}

test("database security proposals enforce role and parent boundaries", async (t) => {
  const db = new PGlite();
  try {
    await fixture(db);
    await db.exec(readFileSync(path.join(__dirname, "..", "supabase", "migrations", "202610290001_attendance_status.sql"), "utf8"));
    await db.exec(`
      insert into teachers values ('${id(101)}', '${id(1)}', '${id(12)}', 'active'), ('${id(102)}', '${id(1)}', '${id(17)}', 'active');
      insert into teacher_assignments (school_id, teacher_id, class_id, subject_id) values ('${id(1)}', '${id(101)}', '${id(21)}', '${id(31)}');
      insert into classes values ('${id(23)}', '${id(1)}');
      insert into subjects values ('${id(33)}', '${id(1)}');
      insert into students values ('${id(44)}', '${id(1)}', '${id(23)}', 'unassigned'), ('${id(45)}', '${id(1)}', null, 'unallocated');
    `);
    await t.test("read-only preflight reports counts without changing records", async () => {
      const sql = readFileSync(path.join(__dirname, "..", "supabase", "proposals", "preflight.sql"), "utf8");
      const { rows } = await db.query(sql);
      assert.ok(rows.length >= 10);
      for (const row of rows) assert.equal(Number(row.problem_count), row.check_name === "active_teachers_without_teacher_membership" ? 1 : 0, row.check_name);
    });
    await t.test("parents see only linked children and their records", async () => {
      await signIn(db, 11);
      for (const table of ["students", "fees", "attendance", "results", "result_amendments", "student_parents"]) {
        const { rows } = await db.query(`select * from ${table}`);
        assert.equal(rows.length, 1, table);
      }
      const { rows } = await db.query("select * from schools");
      assert.equal(rows.length, 1);
      await assert.rejects(db.exec(`insert into attendance values ('${id(90)}', '${id(1)}', '${id(41)}', '${id(21)}')`), /row-level security/);
    });
    await t.test("teachers cannot read or create financial records", async () => {
      await signIn(db, 12);
      assert.equal((await db.query("select * from fees")).rows.length, 0);
      await assert.rejects(db.exec(`insert into fees values ('${id(91)}', '${id(1)}', '${id(41)}', 100)`), /row-level security/);
    });
    await t.test("teacher assignments constrain class, student and subject access", async () => {
      await signIn(db, 12);
      assert.equal((await db.query("select * from classes")).rows.length, 1);
      assert.equal((await db.query("select * from subjects")).rows.length, 1);
      assert.equal((await db.query("select * from teachers")).rows.length, 1);
      assert.equal((await db.query("select * from students")).rows.length, 2);
      await assert.rejects(db.exec(`insert into results values ('${id(111)}', '${id(1)}', '${id(41)}', '${id(21)}', '${id(33)}', 90)`), /row-level security/);
      await assert.rejects(db.exec(`insert into attendance values ('${id(112)}', '${id(1)}', '${id(44)}', '${id(23)}')`), /row-level security/);
      await assert.rejects(db.exec(`insert into teacher_assignments (school_id, teacher_id, class_id, subject_id) values ('${id(1)}', '${id(101)}', '${id(23)}', '${id(33)}')`), /row-level security/);
    });
    await t.test("assigned teachers can record Excused attendance on a previous date", async () => {
      await signIn(db, 12);
      await db.exec(`insert into attendance (id, school_id, student_id, class_id, date, status) values ('${id(120)}', '${id(1)}', '${id(42)}', '${id(21)}', '2026-10-01', 'excused')`);
      assert.equal((await db.query(`select status from attendance where id = '${id(120)}'`)).rows[0].status, "excused");
      await assert.rejects(db.exec(`insert into attendance (id, school_id, student_id, class_id, date, status) values ('${id(121)}', '${id(1)}', '${id(42)}', '${id(21)}', '2026-10-01', 'unknown')`), /check constraint/);
    });
    await t.test("only admins can configure valid academic periods", async () => {
      await signIn(db, 14);
      await db.exec(`insert into school_academic_settings (school_id, academic_year, term) values ('${id(1)}', '2026/2027', 'term_2')`);
      await assert.rejects(db.exec(`update school_academic_settings set academic_year = '2026/2028'`), /check constraint/);
      await signIn(db, 11);
      assert.equal((await db.query("select * from school_academic_settings")).rows.length, 1);
      await db.exec("update school_academic_settings set term = 'term_3'");
      assert.equal((await db.query("select term from school_academic_settings")).rows[0].term, "term_2");
    });
    await t.test("admins cannot create cross-school student links or results", async () => {
      await signIn(db, 14);
      await db.exec(`insert into teacher_assignments (school_id, teacher_id, class_id, subject_id) values ('${id(1)}', '${id(101)}', '${id(23)}', '${id(33)}')`);
      await assert.rejects(db.exec(`insert into student_parents values ('${id(41)}', '${id(16)}')`), /row-level security/);
      await assert.rejects(db.exec(`insert into students values ('${id(92)}', '${id(1)}', '${id(22)}', 'invalid-class')`), /row-level security/);
      await assert.rejects(db.exec(`insert into results values ('${id(93)}', '${id(1)}', '${id(41)}', '${id(21)}', '${id(32)}', 90)`), /row-level security/);
    });
    await t.test("legacy year separators cannot create duplicate term charges or results", async () => {
      await signIn(db, 14);
      await assert.rejects(db.exec(`insert into fees values ('${id(114)}', '${id(1)}', '${id(41)}', 100, '2026-2027', 'term_1')`), /duplicate key/);
      await assert.rejects(db.exec(`insert into results values ('${id(115)}', '${id(1)}', '${id(41)}', '${id(21)}', '${id(31)}', 90, '2026-2027', 'term_1')`), /duplicate key/);
    });
    await t.test("result originals cannot be overwritten or deleted", async () => {
      await signIn(db, 14);
      await db.exec("update results set score = 99; delete from results;");
      assert.equal((await db.query(`select score from results where id = '${id(71)}'`)).rows[0].score, "80");
    });
    await t.test("database derives grades and preserves the current amendment chain", async () => {
      await signIn(db, 14);
      await db.exec(`insert into results (id, school_id, student_id, class_id, subject_id, score, grade) values ('${id(118)}', '${id(1)}', '${id(44)}', '${id(23)}', '${id(33)}', 95, 'F')`);
      assert.equal((await db.query(`select grade from results where id = '${id(118)}'`)).rows[0].grade, "A");
      await db.exec(`insert into result_amendments (id, school_id, result_id, amended_by, new_score, reason, old_score, new_grade) values ('${id(116)}', '${id(1)}', '${id(71)}', '${id(14)}', 90, ' Verified correction ', 0, 'F')`);
      const amendment = (await db.query(`select * from result_amendments where id = '${id(116)}'`)).rows[0];
      assert.equal(Number(amendment.old_score), 85);
      assert.equal(amendment.new_grade, "A");
      assert.equal(amendment.reason, "Verified correction");
      await db.exec(`insert into result_amendments (id, school_id, result_id, amended_by, new_score, reason) values ('${id(119)}', '${id(1)}', '${id(118)}', '${id(14)}', 85, 'First correction')`);
      assert.equal(Number((await db.query(`select old_score from result_amendments where id = '${id(119)}'`)).rows[0].old_score), 95);
      assert.equal(Number((await db.query(`select score from results where id = '${id(71)}'`)).rows[0].score), 80);
      await assert.rejects(db.exec(`insert into result_amendments (id, school_id, result_id, amended_by, new_score, reason) values ('${id(117)}', '${id(1)}', '${id(71)}', '${id(11)}', 99, 'Spoofed actor')`), /actor/);
    });
    await t.test("accountants can record payments but cannot overpay or delete history", async () => {
      await signIn(db, 13);
      await db.exec(`insert into payments values ('${id(94)}', '${id(1)}', '${id(41)}', '${id(51)}', 60)`);
      await assert.rejects(db.exec(`insert into payments values ('${id(95)}', '${id(1)}', '${id(41)}', '${id(51)}', 50)`), /remaining balance/);
      await assert.rejects(db.exec(`insert into payments values ('${id(96)}', '${id(1)}', '${id(42)}', '${id(51)}', 10)`), /does not belong/);
      await db.exec("delete from payments");
      assert.equal((await db.query("select * from payments")).rows.length, 1);
    });
    await t.test("inactive-school membership grants no school access", async () => {
      await signIn(db, 15);
      assert.equal((await db.query("select * from schools")).rows.length, 0);
      await assert.rejects(db.exec(`insert into classes values ('${id(97)}', '${id(3)}')`), /row-level security/);
    });
  } finally {
    await db.close();
  }
});
