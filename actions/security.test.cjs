const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function load(relativePath, dependencies) {
  const source = readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "server-only") return {};
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    console,
  });
  return exports;
}

function clientFor(tables, userId = "actor") {
  return {
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    from(table) {
      assert.ok(table in tables, `Unexpected table: ${table}`);
      const query = {
        select() { return query; },
        eq() { return query; },
        async maybeSingle() { return { data: tables[table], error: null }; },
        then(resolve) { resolve({ data: tables[table], error: null }); },
      };
      return query;
    },
  };
}

test("school account creation rejects forged roles before using admin client", async () => {
  const { createSchoolAccount } = load("actions/accounts.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/get-user": { getCurrentUser: async () => ({ role: "school_admin", schoolId: "school" }) },
    "@/lib/supabase/admin": { createAdminClient() { assert.fail("Admin client must not be used"); } },
  });
  for (const role of ["school_admin", "super_admin", "unknown", null]) {
    const result = await createSchoolAccount({ role, schoolId: "school" });
    assert.equal(result.success, false);
    assert.equal(result.error, "Invalid account role.");
  }
});

test("parent records deny non-parent accounts before querying student data", async () => {
  for (const user of [null, { role: "teacher", schoolId: "school" }, { role: "parent", schoolId: null }]) {
    const { getParentRecords } = load("lib/auth/get-parent-records.ts", {
      "@/lib/auth/get-user": { getCurrentUser: async () => user },
      "@/lib/supabase/server": { createClient() { assert.fail("Unauthorized data query"); } },
    });
    assert.equal(await getParentRecords(), null);
  }
});

test("parents without linked children do not query student records", async () => {
  const client = {
    from(table) {
      assert.equal(table, "student_parents");
      return { select() { return this; }, async eq(column, value) {
        assert.equal(column, "parent_id");
        assert.equal(value, "parent");
        return { data: [], error: null };
      } };
    },
  };
  const { getParentRecords } = load("lib/auth/get-parent-records.ts", {
    "@/lib/auth/get-user": { getCurrentUser: async () => ({ id: "parent", role: "parent", schoolId: "school" }) },
    "@/lib/supabase/server": { createClient: async () => client },
  });
  const records = await getParentRecords();
  assert.equal(records.children.length, 0);
});

test("parent record queries stay within linked students and paginate attendance", async () => {
  const calls = [];
  const client = {
    from(table) {
      const filters = {};
      const query = {
        select() { return query; },
        order() { return query; },
        eq(column, value) { filters[column] = value; return query; },
        in(column, values) { filters[column] = values; return query; },
        then(resolve) {
          assert.equal(table, "student_parents");
          assert.equal(filters.parent_id, "parent");
          resolve({ data: [{ student_id: "child" }], error: null });
        },
        async range(from, to) {
          assert.equal(filters.school_id, "school");
          assert.deepEqual(Array.from(filters[table === "students" ? "id" : "student_id"]), ["child"]);
          calls.push({ table, from, to });
          return { data: table === "attendance" ? Array.from({ length: from === 0 ? 500 : 1 }, (_, index) => ({ id: `${from + index}`, student_id: "child" })) : [], error: null };
        },
      };
      return query;
    },
  };
  const { getParentRecords } = load("lib/auth/get-parent-records.ts", {
    "@/lib/auth/get-user": { getCurrentUser: async () => ({ id: "parent", role: "parent", schoolId: "school" }) },
    "@/lib/supabase/server": { createClient: async () => client },
  });
  const records = await getParentRecords();
  assert.equal(records.attendance.length, 501);
  assert.ok(calls.some((call) => call.table === "attendance" && call.from === 500));
});

for (const status of ["inactive", "active"]) {
  test(`management context handles ${status} schools and retains actor identity`, async () => {
    const client = clientFor({
      platform_memberships: null,
      school_memberships: { school_id: "school", role: "teacher" },
      schools: { id: "school", status },
      teacher_assignments: [],
    });
    const { getManagementContext } = load("lib/auth/get-management-context.ts", {
      "@/lib/supabase/server": { createClient: async () => client },
      "@/lib/supabase/admin": { createAdminClient() { assert.fail("No service role for teachers"); } },
    });
    const context = await getManagementContext("school");
    if (status === "inactive") assert.equal(context, null);
    else {
      assert.equal(context.userId, "actor");
      assert.equal(context.client, client);
    }
    assert.equal(await getManagementContext("other-school"), null);
  });
}

test("teacher scope rejects unassigned and crossed class/subject pairs", () => {
  const { canAccessTeachingScope } = load("lib/auth/teacher-scope.ts", {});
  const context = { role: "teacher", teacherAssignments: [{ class_id: "one", subject_id: "math" }, { class_id: "two", subject_id: "science" }] };
  assert.equal(canAccessTeachingScope(context, "one", "math"), true);
  assert.equal(canAccessTeachingScope(context, "one", "science"), false);
  assert.equal(canAccessTeachingScope({ role: "teacher" }, "one"), false);
  assert.equal(canAccessTeachingScope({ role: "school_admin" }, "one"), true);
});

test("academic periods require consecutive years and valid terms", () => {
  const { validateAcademicPeriod } = load("lib/academics/period.ts", {});
  assert.equal(validateAcademicPeriod("2026/2027", "term_2"), null);
  for (const [year, term] of [["2026-2027", "term_1"], ["2026/2028", "term_1"], ["2026/2027", "term_4"]]) assert.ok(validateAcademicPeriod(year, term));
});

test("financial arithmetic uses integer cents and rejects fractional cents", () => {
  const { isValidMoney, moneyToCents } = load("lib/academics/money.ts", {});
  for (const value of [0, 0.29, 0.3, 1234.56]) assert.equal(isValidMoney(value), true);
  for (const value of [-1, NaN, Infinity, 1.001, Number.MAX_SAFE_INTEGER]) assert.equal(isValidMoney(value), false);
  assert.equal(moneyToCents(0.6) - moneyToCents(0.1) - moneyToCents(0.2), moneyToCents(0.3));
});

test("teacher creation links the teacher record to the new login", async () => {
  let inserted;
  const admin = {
    auth: { admin: { createUser: async () => ({ data: { user: { id: "new-login" } }, error: null }) } },
    from(table) {
      if (table === "schools") return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: "school" }, error: null }; } };
      return { async upsert() { return { error: null }; }, async insert(record) { if (table === "teachers") inserted = record; return { error: null }; } };
    },
  };
  const { createTeacher } = load("actions/teachers.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/get-management-context": { getManagementContext: async () => ({ role: "school_admin", schoolId: "school" }) },
    "@/lib/supabase/admin": { createAdminClient: () => admin },
  });
  const form = new FormData();
  for (const [key, value] of Object.entries({ first_name: "Test", last_name: "Teacher", email: "teacher@example.test", password: "synthetic-test-password" })) form.set(key, value);
  assert.equal((await createTeacher(form)).success, true);
  assert.equal(inserted.user_id, "new-login");
});

test("report access checks parent links before loading a student report", async () => {
  const { getStudentReport, getPaymentReceipt } = load("lib/reports/data.ts", {
    "@/lib/auth/get-user": { getCurrentUser: async () => ({ id: "parent", role: "parent", schoolId: "school" }) },
    "@/lib/auth/get-management-context": { getManagementContext() { assert.fail("Parents must not use management context"); } },
    "@/lib/supabase/server": { createClient: async () => ({ from(table) {
      assert.ok(["student_parents", "payments"].includes(table));
      return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: table === "payments" ? { student_id: "unlinked" } : null, error: null }; } };
    } }) },
    "@/lib/supabase/read-all": { readAllRows() { assert.fail("Unlinked student report queried"); } },
    "@/lib/academics/period": load("lib/academics/period.ts", {}),
  });
  assert.equal(await getStudentReport("unlinked", "2026/2027", "term_1"), null);
  assert.equal(await getPaymentReceipt("payment"), null);
  assert.equal(await getStudentReport("unlinked", "2026/2027", "term_1", "other-school"), null);
});

test("report and receipt data include amendments and the original payment identity", async () => {
  const tables = {
    student_parents: { student_id: "child" },
    students: { id: "child", first_name: "Test", last_name: "Student", student_id: "TEST-1" },
    schools: { id: "school", name: "Test school" },
    payments: { id: "payment", student_id: "child", fee_id: "fee", amount: "25.00" },
    fees: { academic_year: "2026/2027", term: "term_1" },
  };
  const client = { from(table) {
    const query = { table, filters: {}, select() { return query; }, eq(key, value) { query.filters[key] = value; return query; }, in() { return query; }, order() { return query; }, async maybeSingle() {
      if (table === "student_parents") assert.equal(query.filters.parent_id, "parent");
      else assert.equal(query.filters[table === "schools" ? "id" : "school_id"], "school");
      return { data: tables[table], error: null };
    } };
    return query;
  } };
  const { getStudentReport, getPaymentReceipt } = load("lib/reports/data.ts", {
    "@/lib/auth/get-user": { getCurrentUser: async () => ({ id: "parent", role: "parent", schoolId: "school" }) },
    "@/lib/auth/get-management-context": { getManagementContext() { assert.fail("Unexpected management access"); } },
    "@/lib/supabase/server": { createClient: async () => client },
    "@/lib/supabase/read-all": { readAllRows: async (query) => {
      assert.equal(query.filters.school_id, "school");
      if (query.table === "results") { assert.equal(query.filters.student_id, "child"); return [{ id: "result", score: 70, grade: "B" }]; }
      assert.equal(query.filters["results.student_id"], "child");
      return [{ result_id: "result", new_score: 90, new_grade: "A" }];
    } },
    "@/lib/academics/period": load("lib/academics/period.ts", {}),
  });
  const report = await getStudentReport("child", "2026/2027", "term_1");
  assert.equal(report.results[0].score, 90);
  assert.equal(report.results[0].grade, "A");
  const receipt = await getPaymentReceipt("payment");
  assert.equal(receipt.payment.id, "payment");
  assert.equal(Number(receipt.payment.amount), 25);
});

test("configuration mutations reject teachers before database writes", async () => {
  const actions = load("actions/configuration.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/auth/get-management-context": { getManagementContext: async () => ({ role: "teacher" }) },
    "@/lib/supabase/admin": { createAdminClient() { assert.fail("Unauthorized admin access"); } },
    "@/lib/academics/period": load("lib/academics/period.ts", {}),
  });
  for (const action of Object.values(actions)) assert.ok((await action(new FormData())).error);
});

test("super admin context retains authenticated actor separately from service client", async () => {
  const authenticated = clientFor({ platform_memberships: { role: "super_admin" } });
  const service = clientFor({ schools: { id: "school" } }, "not-the-actor");
  const { getManagementContext } = load("lib/auth/get-management-context.ts", {
    "@/lib/supabase/server": { createClient: async () => authenticated },
    "@/lib/supabase/admin": { createAdminClient: () => service },
  });
  assert.equal(await getManagementContext(), null);
  const context = await getManagementContext("school");
  assert.equal(context.userId, "actor");
  assert.equal(context.client, service);
});
